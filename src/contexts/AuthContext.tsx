/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: string | null; needsEmailConfirm?: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      return;
    }

    const ensureUserProfile = async (nextUser: User | null) => {
      if (!nextUser) return;

      await client.from("user_profiles").upsert(
        {
          id: nextUser.id,
          email: nextUser.email ?? null,
          full_name: (nextUser.user_metadata?.full_name as string) ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    };

    const bootstrap = async () => {
      const { data } = await client.auth.getSession();
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      await ensureUserProfile(data.session?.user ?? null);
      setLoading(false);
    };

    void bootstrap();

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession ?? null);
        setUser(nextSession?.user ?? null);
        void ensureUserProfile(nextSession?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signIn: async (email, password) => {
        if (!isSupabaseConfigured || !supabase) {
          return {
            error: "Chưa cấu hình Supabase. Vui lòng kiểm tra file .env.",
          };
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        return { error: error?.message ?? null };
      },
      signUp: async (email, password, fullName) => {
        if (!isSupabaseConfigured || !supabase) {
          return {
            error: "Chưa cấu hình Supabase. Vui lòng kiểm tra file .env.",
          };
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName ?? "",
            },
          },
        });

        return {
          error: error?.message ?? null,
          needsEmailConfirm: !data.session,
        };
      },
      signOut: async () => {
        if (!isSupabaseConfigured || !supabase) {
          return;
        }
        await supabase.auth.signOut();
      },
    }),
    [loading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
