type Job = {
  id: number;
  title: string;
  company: string;
  salary: string;
  location: string;
};

export default function JobCard({ job }: { job: Job }) {
  return (
    <div className="job-card">
      <h2>{job.title}</h2>
      <p className="company">{job.company}</p>

      <div className="meta">
        <span className="salary">{job.salary}</span>
        <span className="location">{job.location}</span>
      </div>
    </div>
  );
}