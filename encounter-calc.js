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
		let crXPLookup = [
			10,		// 0
			25,		// 1/8
			50,		// 1/4
			100,	// 1/2
			200,	// 1
			450,	// 2
			700,
			1100,
			1800,
			2300,
			2900,
			3900,
			5000,
			5900,
			7200,
			8400,
			10000,
			11500,
			13000,
			15000,
			18000,
			20000,
			22000,
			25000,
			33000,
			41000,
			50000,
			62000,
			75000,
			90000,
			105000,
			120000,
			135000,
			155000
		];
		
		function crXP(cr) {
			if (cr <= 1)
				return crXPLookup[Math.trunc(cr * 4)];
			return crXPLookup[Math.trunc(cr) + 3];
		}

		let enemyNames = {};
		let playerNames = [];
		let neutralNames = {};
		let friendlyNames = {};

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
		let friendlies = 0;
		
		let totalXP = 0;

		for (let t of tokens) {
			let a = t.actor;
			if (!a)
				continue;
			a.prepareBaseData();
			a.prepareData();
			a.prepareDerivedData();
			//a.prepareEmbeddedDocuments();
			switch (t.document.disposition) {
			case 1:
				// Friendly
				if (a.type == 'character' && t.document.sight.enabled) {
					// PC.
					characters++;
					let threshold = xpLookup[a.system.details.level];
					easy += threshold[0];
					medium += threshold[1];
					hard += threshold[2];
					deadly += threshold[3];
					playerNames.push(t.name);
				} else {
					friendlies++;
					if (!friendlyNames[t.name])
						friendlyNames[t.name] = 0;
					friendlyNames[t.name]++;
				}
				break;
			case -1:
			case -2:
				// Hostile and secret.
				enemies++;
				let xp = 0;
				if (a.type == 'character') {
					if (a.system.details.xp.value)
						xp = a.system.details.xp.value;
					else
						xp = crXP(a.system.details.level/2);
				} else if (a.system.details.xp)
					xp = a.system.details.xp.value;
				totalXP += xp;
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
		let fNames = '';
		for (let key in friendlyNames) {
			if (fNames)
				fNames += ', ';
			fNames += `${key}: ${friendlyNames[key]}`;
		}
		
		let encounterCR = '20+';

		// If no characters are in the scene, assume there are 5.

		if (characters == 0)
			characters = 5;

		for (let i = 1; i <= 20; i++)
			if (adjXP < characters * xpLookup[i][2]) {
				encounterCR = i;
				break;
			}
		
		await Dialog.prompt({
		  title: "Encounter Difficulty",
		  content: `<p>Characters: ${characters} (${playerNames.join(', ')})</p>
					<p>Friendly: ${friendlies} (${fNames})</p>
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

export class SwadeEncounter {
	static edges = [];
	static hindrances = [];
	static specialAbilities = [];
	static powers = [];
	static ancestralAbilities = [];
	static staticInitialized = false;

	async calcDiff() {
	
		let enemyNames = {};
		let playerNames = [];
		let neutralNames = {};
		let friendlyNames = {};

		// Use all tokens in scene by default. If tokens selected just use those.
		let tokens = canvas.tokens.controlled;

		if (tokens.length == 0)
			tokens = canvas.tokens.children[0].children;

		let characters = 0;
		let enemies = 0;
		let neutrals = 0;
		let friendlies = 0;
		let charTotal = 0;
		let hostileTotal = 0;
		let neutralTotal = 0;
		let friendlyTotal = 0;
		
		
		for (let t of tokens) {
			let a = t.actor;
			if (!a)
				continue;

			let [cv, cvDetails] = this.combatValue(a);

			switch (t.document.disposition) {
			case 1:
				// Friendly
				if (a.type == 'character' && t.document.sight.enabled) {
					// PC.
					characters++;
					playerNames.push(t.name);
					charTotal += cv;
				} else {
					friendlies++;
					if (!friendlyNames[t.name])
						friendlyNames[t.name] = 0;
					friendlyNames[t.name]++;
					friendlyTotal += cv;
				}
				break;
			case -1:
			case -2:
				// Hostile and secret.
				enemies++;
				if (!enemyNames[t.name])
					enemyNames[t.name] = 0;
				enemyNames[t.name]++;
				hostileTotal += cv;
				break;
			case 0:
				// Neutral.
				if (!neutralNames[t.name])
					neutralNames[t.name] = 0;
				neutralNames[t.name]++;
				neutrals++;
				neutralTotal += cv;
				break;
			}
		}
		
		
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
		let fNames = '';
		for (let key in friendlyNames) {
			if (fNames)
				fNames += ', ';
			fNames += `${key}: ${friendlyNames[key]}`;
		}
		
		await Dialog.prompt({
		  title: "Encounter Difficulty",
		  content: `<p>Characters: CV ${charTotal} (${characters}: ${playerNames.join(', ')})</p>
					<p>Friendly: CV ${friendlyTotal} (${friendlies}: ${fNames})</p>
					<p>Neutral: CV ${neutralTotal} (${neutrals}: ${nNames})</p>
					<p>Enemies: CV ${hostileTotal} (${enemies}: ${names})</p>`
					,
		  label: "OK",
		  callback: (html) => { ; }
		});
		
	}

	combatValue(actor) {
		const wcProbabilities = [.62, .75, .81, .85, .88, .94, .99];
		const probabilities =   [.25, .50, .63, .70, .75, .83, .92];
		
		function getDieProb(actor, die) {
			let index = (die.sides - 4) / 2;
			if (die.modifier > 0)
				index += Math.min(die.modifier, 2);
			if (actor.system.wildcard)
				return wcProbabilities[index];
			return probabilities[index];
		}

		function getSkillProb(actor, name) {
			let skill = actor.items.find(skill => skill.name == name);
			if (!skill)
				return actor.system.wildcard ? .32 : .19;
			return getDieProb(actor, skill.system.die);
		}
		
		if (actor.type != 'character' && actor.type != 'npc')
			return 'N/A';
		
		let cv = 0;
		let cvDetails = '';

		let weapons  = actor.items.filter(it => it.type == 'weapon' || it.type == 'power');

		// Get the potential of the most damaging weapon or power.

		let maxDamage = 0;
		
		let s = actor.system;
		let strength = 'd' + s.attributes.strength.die.sides;
		if (s.attributes.strength.modifier > 0)
			strength += `+@{s.attributes.strength.modifier}`;
		else if (s.attributes.strength.modifier < 0)
			strength += `@{s.attributes.strength.modifier}`;

		let details = '';

		for (let w of weapons) {
			if (!w.system.damage)
				continue;
			let damage = w.system.damage.replace("@str", strength);
			let dmg = damage.replaceAll(/([0-9]+)d/g, "$1*");
			dmg = dmg.replaceAll("d", "");
			try {
				dmg = eval(dmg);
			} catch (e) {
				dmg = 0;
			}
			let skillProb = actor.system.wildcard ? .32 : .19;
			const p = getSkillProb(actor, w.system.actions.trait);
			if (p > skillProb)
				skillProb = p;

			dmg = Math.round(dmg * skillProb);

			if (dmg > maxDamage) {
				maxDamage = dmg;
				details = `${w.name} (${w.system.actions.trait}, ${damage}): ${dmg}`;
			}
		}

		cv += maxDamage;
		if (cvDetails)
			cvDetails += ', ';
		cvDetails += details;

		// Modify CV for toughness, parry and vigor.

		let tough = (s.stats.toughness.value - 5);
		if (tough > 0)
			tough *= (1 + s.wounds.max);
		cv += tough;
		if (tough)
			cvDetails += `, Toughness*Wounds ${tough}`;
		let pp = Math.round(s.powerPoints.general.max/5)
		if (pp) {
			cv += pp;
			cvDetails += `, Power Points: ${pp}`;
		}

		const parry = s.stats.parry.value - 5;
		cv += parry;
		if (parry)
			cvDetails += `, Parry ${parry}`;
		const vigor = (s.attributes.vigor.die.sides - 4) / 2 + s.attributes.vigor.die.modifier;
		cv += vigor;
		if (vigor)
			cvDetails += `, Vigor ${vigor}`;
		
		for (let item of actor.items) {
			let value = 0;
			switch (item.type) {
			case 'edge':
				value = SwadeEncounter.edges[item.name];
				break;
			case 'ability':
				value = SwadeEncounter.specialAbilities[item.name];
				if (!value)
					value = SwadeEncounter.specialAbilities[item.name];
				break;
			case 'power':
				value = SwadeEncounter.powers[item.name];
				break;
			case 'hindrance':
				value = SwadeEncounter.hindrances[item.name];
				break;
			}
			if (value) {
				cv += value;
				cvDetails += `, ${item.name}: ${value}`;
			}
		}

		if (s.wildcard)
			cv *= 3;

		return [cv, cvDetails];
	}

	static {
		console.log("SwadeEncounter | loaded.");

		async function getCombatValues() {
			async function getValues(entry, arr) {
				let fileName = "modules/htmlfilter/filters/" + entry + ".cv";

				let response = await fetch(fileName);
				if (!response.ok) {
					return false;
				}
			
				let itemList = await response.text();
				let entries = itemList.split(/\r*\n/);
				for (let entry of entries) {
					let [name, value] = entry.split(/ *: */);
					if (name && value) {
						arr[name] = Number(value);
					}
				}
			}

			await getValues('Edges', SwadeEncounter.edges);
			await getValues('SpecialAbilities', SwadeEncounter.specialAbilities);
			await getValues('AncestralAbilities', SwadeEncounter.ancestralAbilities);
			await getValues('Hindrances', SwadeEncounter.hindrances);
			await getValues('Powers', SwadeEncounter.powers);
		}

		Hooks.on("init", async function() {
			if (game.system.id == 'swade') {
				console.log("SwadeEncounter | initialized.");
				await getCombatValues();
			}
		});
	}

}

Hooks.on("renderActorDirectory", (app, html, data) => {
	if (!game.user.isGM)
		return;

    const filterButton = $("<button id='encounter-calc-button'><i class='fas fa-hand-fist'></i></i>Encounter Calculator</button>");
    html.find(".directory-footer").append(filterButton);

    filterButton.click(async (ev) => {
		try {
			let ec = null;
			switch (game.system.id) {
			case 'dnd5e':
				ec = new EncounterCalc();
				ec.calcDiff();
				break;
			case 'swade':
				ec = new SwadeEncounter();
				ec.calcDiff();
				break;
			}

		} catch (msg) {
			ui.notifications.warn(msg);
		}
    });
});

