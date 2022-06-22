import { Client } from "@notionhq/client"

const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = "80584cee0bb9461e886a90f22924856e";

function graphID(pageID) {
    return 'x' + pageID.slice(0, 8);
}

(async () => {
    const response = await notion.databases.query({
        database_id: databaseId,
    });

    const items = [];
    const subgraphs = {};
    const relationships = [];

    for (const page of response.results) {
        if (page.properties['Status'].select?.name === 'Archived') {
            continue;
        }

        console.log(page, page.properties['Status'].select);

        const properties = [];

        const titleObj = page.properties['Name'].title[0];
        if (!titleObj) {
            continue;
        }
        const title = titleObj.plain_text;
        properties.push(`label="${title}"`);

        properties.push(`color=${page.properties['Status'].select.color}`);

        const subteams = page.properties['Subteam'].multi_select;
        const subteam = subteams.length === 1 ? subteams[0] : null;

        const itemDot = `${graphID(page.id)} [${properties.join(', ')}];`;

        if (subteam) {
            if (!subgraphs[subteam.name]) {
                subgraphs[subteam.name] = [];
            }
            subgraphs[subteam.name].push(itemDot);
        } else {
            items.push(itemDot);
        }

        for (const relation of page.properties['Blocks'].relation) {
            relationships.push(`${graphID(page.id)} -> ${graphID(relation.id)};`);
        }
    }

    let subgraphIndex = 0;

    let dot = `digraph {\n`;
    dot += `rankdir="LR";\n`
    dot += items.join('\n') + '\n';
    for (const [name, items] of Object.entries(subgraphs)) {
        dot += `subgraph cluster${subgraphIndex++} {\n`;
        dot += `label="${name}";\n`;
        dot += items.join('\n') + '\n';
        dot += `}\n`;
    }
    dot += relationships.join('\n') + '\n';
    dot += `}\n`;

    console.log(dot);
})();
