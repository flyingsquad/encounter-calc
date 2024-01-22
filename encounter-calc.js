/**	Calculate the difficulty of the encounter based on the tokens selected.
 */

export class EncounterCalc {

	async calcDiff() {
		let xpLookup = [
			[0, 0, 0, 0],
			[25,50,75,100],
			[50,100,150,200],
			[75,150,225,400],
			[125,250,375,500],
			[250,500,750,1100],
			[300,600,900,1400],
			[350,750,1100,1700],
			[450,900,1400,2100],
			[550,1100,1600,2400],
			[600,1200,1900,2800],
			[800,1600,2400,3600],
			[1000,2000,3000,4500],
			[1100,2200,3400,5100],
			[1250,2500,3800,5700],
			[1400,2800,4300,6400],
			[1600,3200,4800,7200],
			[2000,3900,5900,8800],
			[2100,4200,6300,9500],
			[2400,4900,7300,10900],
			[2800,5700,8500,12700]
		];

		let enemyNames = {};
		let playerNames = [];
		let neutralNames = {};

		// Use all tokens in scene by default. If tokens selected just use those.
		let tokens = canvas.tokens.controlled;

		if (tokens.length == 0)
			tokens = canvas.tokens.children[0].children;

		let enemies = 0;
		let easy = 0;
		let medium = 0;
		let hard = 0;
		let deadly = 0;

		let characters = 0;
		let characterLevels = 0;
		
		let neutrals = 0;
		
		let totalXP = 0;

		for (let t of tokens) {
			let a = t.actor;
			/*
				a.prepareBaseData();
				a.prepareData();
				a.prepareDerivedData();
				a.prepareEmbeddedDocuments();
			*/
			switch (t.document.disposition) {
			case 1:
				// Friendly
				if (a.type == 'character') {
					// PC.
					characters++;
					let threshold = xpLookup[a.system.details.level];
					easy += threshold[0];
					medium += threshold[1];
					hard += threshold[2];
					deadly += threshold[3];
					playerNames.push(t.name);
				}
				break;
			case -1:
			case -2:
				// Hostile and secret.
				enemies++;
				totalXP += a.system.details.xp.value;
				if (!enemyNames[t.name])
					enemyNames[t.name] = 0;
				enemyNames[t.name]++;
				break;
			case 0:
				// Neutral.
				if (!neutralNames[t.name])
					neutralNames[t.name] = 0;
				neutralNames[t.name]++;
				neutrals++;
				break;
			}
		}
		
		let avgLevel = Math.round(characterLevels / characters);
		let encMult = 1;
		switch (enemies) {
		case 1:
		case 0:
			encMult = 1;
			break;
		case 2:
			encMult = 1.5;
			break;
		case 3:
		case 4:
		case 5:
		case 6:
			encMult = 2;
			break;
		case 7:
		case 8:
		case 9:
		case 10:
			encMult = 2.5;
			break;
		case 11:
		case 12:
		case 13:
		case 14:
			encMult = 3;
			break;
		default:
			encMult = 4;
			break;
		}
		
		let adjXP = encMult * totalXP;
		let diff;
		if (adjXP < easy)
			diff = 'Trivial';
		else if (adjXP < medium)
			diff = 'Easy';
		else if (adjXP < hard)
			diff = 'Medium';
		else if (adjXP < deadly)
			diff = 'Hard';
		else
			diff = 'Deadly';
		
		let names = '';
		for (let key in enemyNames) {
			if (names)
				names += ', ';
			names += `${key}: ${enemyNames[key]}`;
		}
		let nNames = '';
		for (let key in neutralNames) {
			if (nNames)
				nNames += ', ';
			nNames += `${key}: ${neutralNames[key]}`;
		}
		
		let encounterCR = '20+';
		
		for (let i = 1; i <= 20; i++)
			if (adjXP < characters * xpLookup[i][2]) {
				encounterCR = i;
				break;
			}
		
		await Dialog.prompt({
		  title: "Encounter Difficulty",
		  content: `<p>Characters: ${characters} (${playerNames.join(', ')})</p>
					<p>Neutral: ${neutrals} (${nNames})</p>
					<p>Enemies: ${enemies} (${names})</p>
					<p>Total XP: ${totalXP}, Multiplier: ${encMult}, Adjusted XP: ${adjXP}</p>
					<p>Easy: ${easy}, Medium: ${medium}, Hard: ${hard}, Deadly: ${deadly}</p>
					<p>Difficulty: ${diff}, Encounter CR: ${encounterCR}</p>`
					,
		  label: "OK",
		  callback: (html) => { ; }
		});
		
	}

}


Hooks.on("renderActorDirectory", (app, html, data) => {

    const filterButton = $("<button id='encounter-calc-button'><i class='fas fa-hand-fist'></i></i>Encounter Calculator</button>");
    html.find(".directory-footer").append(filterButton);

    filterButton.click(async (ev) => {
		try {
			let ec = new EncounterCalc();
			ec.calcDiff();

		} catch (msg) {
			ui.notifications.warn(msg);
		}
    });
});

