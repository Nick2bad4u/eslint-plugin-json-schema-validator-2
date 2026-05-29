declare module "*.module.css" {
    const styles: Readonly<Record<string, string>> & {
        readonly card: string;
        readonly cardAccent: string;
        readonly cardBlue: string;
        readonly cardDescription: string;
        readonly cardGreen: string;
        readonly cardGrid: string;
        readonly cardHeader: string;
        readonly cardLink: string;
        readonly cardPink: string;
        readonly cardTitle: string;
        readonly heroActionButton: string;
        readonly heroActionPrimary: string;
        readonly heroActions: string;
        readonly heroActionSecondary: string;
        readonly heroBadge: string;
        readonly heroBadgeDescription: string;
        readonly heroBadgeLabel: string;
        readonly heroBadgeRow: string;
        readonly heroBanner: string;
        readonly heroContent: string;
        readonly heroGrid: string;
        readonly heroKicker: string;
        readonly heroLiveBadges: string;
        readonly heroPanel: string;
        readonly heroPanelKicker: string;
        readonly heroPanelLogo: string;
        readonly heroPanelText: string;
        readonly heroPanelTitle: string;
        readonly heroStatCard: string;
        readonly heroStatDescription: string;
        readonly heroStatHeading: string;
        readonly heroStats: string;
        readonly heroSubtitle: string;
        readonly heroTitle: string;
        readonly liveBadgeAnchor: string;
        readonly liveBadgeImage: string;
        readonly liveBadgeList: string;
        readonly liveBadgeListItem: string;
        readonly mainContent: string;
    };

    export default styles;
}
