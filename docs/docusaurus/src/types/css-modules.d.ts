declare module "*.module.css" {
    const styles: Readonly<Record<string, string>> & {
        readonly actions: string;
        readonly grid: string;
        readonly hero: string;
        readonly heroContent: string;
        readonly liveBadgeAnchor: string;
        readonly liveBadgeImage: string;
        readonly liveBadgeList: string;
        readonly liveBadgeListItem: string;
        readonly main: string;
        readonly subtitle: string;
        readonly title: string;
    };

    export default styles;
}
