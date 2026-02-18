import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <h1>IMS Admin + Branch Operations</h1>
      <p>Warehouse to Branch inventory workflows, forecasting and budget optimization starter.</p>
      <ul>
        <li>
          <Link href="/optimizer">Go to Budget Optimizer</Link>
        </li>
      </ul>
    </section>
  );
}
