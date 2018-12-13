interface Punchard {
    id: string;
    name: string;
    saltinesCost: number;
    description: string;
}

export const punchcards: Punchard[] = [
    {
        id: 'timehoarder',
        name: "Time hoarder",
        saltinesCost: 70,
        description: "Slows down your team's clock, causing irreparable damage to the fabric of space and time, but boosting your score slightly.",
    },
    {
        id: 'home_row',
        name: "Home Row",
        saltinesCost: 80,
        description: "Sends you a very easy extra challenge from a beta version of Apocalypse Made Easy! Babies Edition that’s sure to give you a higher overall score.",
    },
    {
        id: 'pnp',
        name: "P vs NP",
        saltinesCost: 90,
        description: "Sends you an ultra-hard extra challenge that will significantly boost your overall score. Assuming you can complete it.",
    },
    {
        id: 'hint',
        name: "Motivational Speaker",
        saltinesCost: 120,
        description: "Drops a very obvious hint that'll help you complete an upcoming challenge.",
    },
];
