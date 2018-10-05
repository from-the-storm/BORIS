interface Punchard {
    id: string;
    name: string;
    saltinesCost: number;
    description: string;
}

export const punchcards: Punchard[] = [
    {
        id: 'timehoarder',
        name: "Timehoarder",
        saltinesCost: 50,
        description: "Slow down your team's clock, causing irreparable damage to the fabric of space and time, but boosting your score slightly.",
    },
    {
        id: 'home_row',
        name: "Home Row",
        saltinesCost: 50,
        description: "Detailed information unavailable.",
    },
    {
        id: 'pnp',
        name: "P vs NP",
        saltinesCost: 50,
        description: "Detailed information unavailable.",
    },
    {
        id: 'paper',
        name: "Liquid Paper",
        saltinesCost: 140,
        description: "Detailed information unavailable.",
    },
    {
        id: 'hint',
        name: "Motivational Speaker",
        saltinesCost: 40,
        description: "Detailed information unavailable.",
    },
];
