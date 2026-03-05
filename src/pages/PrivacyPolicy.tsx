import { Link } from "react-router-dom";
import "./PrivacyPolicy.css";

function PrivacyPolicy() {
  return (
    <div className="privacy-page">
      <div className="privacy-card">
        <p className="privacy-breadcrumb">
          <Link to="/">Trang chủ</Link> / Chính sách bảo mật
        </p>
        <h1>Chính sách bảo mật</h1>
        <p className="privacy-updated">Cập nhật lần cuối: 05/03/2026</p>

        <section>
          <h2>1. Mục đích thu thập thông tin</h2>
          <p>
            Nền tảng Tuyển dụng Ninh Bình thu thập thông tin để tạo tài khoản, đăng tin tuyển
            dụng, nộp hồ sơ ứng tuyển và hỗ trợ kết nối giữa nhà tuyển dụng và ứng viên.
          </p>
        </section>

        <section>
          <h2>2. Loại dữ liệu được thu thập</h2>
          <ul>
            <li>Thông tin tài khoản: họ tên, email, số điện thoại.</li>
            <li>Thông tin tuyển dụng: công ty, vị trí, mức lương, địa điểm, liên hệ.</li>
            <li>Thông tin ứng tuyển: CV, kinh nghiệm, ngoại ngữ, mức lương mong muốn.</li>
          </ul>
        </section>

        <section>
          <h2>3. Cách sử dụng dữ liệu</h2>
          <ul>
            <li>Hiển thị hồ sơ và tin tuyển dụng trên nền tảng theo chức năng người dùng.</li>
            <li>Hỗ trợ liên hệ giữa nhà tuyển dụng và ứng viên.</li>
            <li>Cải thiện trải nghiệm và bảo mật hệ thống.</li>
          </ul>
        </section>

        <section>
          <h2>4. Chia sẻ thông tin</h2>
          <p>
            Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ khi có sự đồng ý của
            người dùng hoặc theo yêu cầu của cơ quan có thẩm quyền theo quy định pháp luật.
          </p>
        </section>

        <section>
          <h2>5. Lưu trữ và bảo mật</h2>
          <p>
            Dữ liệu được lưu trữ trên hệ thống có cơ chế kiểm soát truy cập. Người dùng có trách
            nhiệm bảo mật tài khoản, mật khẩu và không chia sẻ thông tin đăng nhập.
          </p>
        </section>

        <section>
          <h2>6. Quyền của người dùng</h2>
          <ul>
            <li>Yêu cầu xem, chỉnh sửa hoặc cập nhật thông tin cá nhân.</li>
            <li>Yêu cầu xóa dữ liệu trong phạm vi pháp luật cho phép.</li>
            <li>Ngừng sử dụng dịch vụ bất kỳ lúc nào.</li>
          </ul>
        </section>

        <section>
          <h2>7. Liên hệ</h2>
          <p>
            Nếu có thắc mắc về chính sách bảo mật, vui lòng liên hệ:{" "}
            <a href="mailto:hrninhbinhtuyendung@gmail.com">hrninhbinhtuyendung@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
