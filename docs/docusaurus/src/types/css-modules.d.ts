declare module "*.module.css" {
  const styles: {
    readonly actions: string;
    readonly grid: string;
    readonly hero: string;
    readonly heroContent: string;
    readonly main: string;
    readonly [key: string]: string;
    readonly subtitle: string;
    readonly title: string;
  };

  export default styles;
}
