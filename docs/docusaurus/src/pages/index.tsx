import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";

import styles from "./index.module.css";

const packageName = "eslint-plugin-json-schema-validator-2";
const description =
  "Validate JSON, YAML, TOML, JavaScript exports, and Vue custom blocks with JSON Schema during ESLint runs.";

export default function Home(): React.JSX.Element {
  return (
    <Layout description={description} title={packageName}>
      <main className={styles["main"]}>
        <section className={styles["hero"]}>
          <div className={styles["heroContent"]}>
            <Heading as="h1" className={styles["title"]}>
              {packageName}
            </Heading>
            <p className={styles["subtitle"]}>{description}</p>
            <div className={styles["actions"]}>
              <Link className="button button--primary" to="/docs/rules/overview">
                Read the docs
              </Link>
              <Link
                className="button button--secondary"
                to="/docs/rules/no-invalid"
              >
                View the rule
              </Link>
            </div>
          </div>
        </section>
        <section className={styles["grid"]}>
          <article>
            <Heading as="h2">Flat Config first</Heading>
            <p>
              Presets export ESLint flat config arrays and keep the older
              `flat/*` aliases for compatibility.
            </p>
          </article>
          <article>
            <Heading as="h2">SchemaStore aware</Heading>
            <p>
              The validation rule can read `$schema`, explicit rule options,
              and SchemaStore catalog entries.
            </p>
          </article>
          <article>
            <Heading as="h2">Multi-format validation</Heading>
            <p>
              JSON-family files, YAML, TOML, JavaScript exports, and Vue custom
              blocks share the same validation path.
            </p>
          </article>
        </section>
      </main>
    </Layout>
  );
}
