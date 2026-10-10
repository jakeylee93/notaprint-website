import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page-head stack-l" style={{ paddingBottom: 120 }}>
      <h1 className="display-l">That page isn&apos;t here.</h1>
      <Link className="btn btn-primary" href="/" style={{ justifySelf: "start" }}>
        Back to the start
      </Link>
    </div>
  );
}
