/*
 * Version 0.4.unreleased
 *
 * Made By Robin Kuiper
 * Skype: RobinKuiper.eu
 * Discord: Atheos#1095
 * My Discord Server: https://discord.gg/AcC9VME
 * Roll20: https://app.roll20.net/users/1226016/robin
 * Roll20 Thread: https://app.roll20.net/forum/post/6248700/script-beta-beyondimporter-import-dndbeyond-character-sheets
 * Github: https://github.com/RobinKuiper/Roll20APIScripts
 * Reddit: https://www.reddit.com/user/robinkuiper/
 * Patreon: https://patreon.com/robinkuiper
 * Paypal.me: https://www.paypal.me/robinkuiper
 *
 * Modified By:
 *
 * Name: Matt DeKok
 * Discord: Sillvva#2532
 * Roll20: https://app.roll20.net/users/494585/sillvva
 *
 * Name: Ammo Goettsch
 * Discord: ammo#7063
 * Roll20: https://app.roll20.net/users/2990964/ammo
 */

(function() {
    const _ABILITIES = {1:'STR',2:'DEX',3:'CON',4:'INT',5:'WIS',6:'CHA'};
    const _ABILITY = {'STR': 'strength', 'DEX': 'dexterity', 'CON': 'constitution', 'INT': 'intelligence', 'WIS': 'wisdom', 'CHA': 'charisma'}
    const abilities = ['STR','DEX','CON','INT','WIS','CHA'];
    const alignments = ['','Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'];
    const skills = ['acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'];
    const strength_skills = ['athletics'];
    const dexterity_skills = ['acrobatics', 'sleight of hand', 'stealth'];
    const intelligence_skills = ['arcana','history','investigation','nature','religion'];
    const wisdom_skills = ['animal_handling','insight','medicine','perception','survival'];
    const charisma_skills = ['deception','intimidation','performance','persuasion']

    // these class features are hidden
    const silent_class_features = [
        'Spellcasting', 
        'Bonus Proficiency', 
        'Ability Score Improvement', 
        'Bonus Cantrip', 
        'Proficiencies', 
        'Hit Points', 
        'Pact Magic', 
        'Expanded Spell List', 
        'Druidic', 
        'Expertise', 
        'Oath Spells'
    ];
   
    // these are added by showing the selected options as class features
    const option_class_features = [
        'Maneuvers',
        'Fighting Style', 
        'Divine Domain', 
        'Arcane Tradition', 
        'Otherworldly Patron', 
        'Ranger Archetype', 
        'Druid Circle', 
        'Sorcerous Origin', 
        'Monastic Tradition', 
        'Bardic College', 
        'Roguish Archetype', 
        'Sacred Oath', 
        'Martial Archetype'
    ];

    let class_spells = [];
    let spellAttacks = [];
    let beyond_caller = {};
    let object;

    // Styling for the chat responses.
    const style = "margin-left: 0px; overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;";
    const buttonStyle = "background-color: #000; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; float: right;"

    let jack = '0';

    const script_name = 'BeyondImporter';
    const state_name = 'BEYONDIMPORTER';
    const debug = false;
    var spellTargetInAttacks = true;
    
    on('ready', function() {
        checkInstall();
        log(script_name + ' Ready! Command: !beyond');
        if(debug) { sendChat(script_name, script_name + ' Ready!', null, {noarchive:true}); }
    });

    on('chat:message', (msg) => {
        if (msg.type != 'api') return;

        // Split the message into command and argument(s)
        let args = msg.content.split(/ --(help|reset|config|imports|import) ?/g);
        let command = args.shift().substring(1).trim();

        beyond_caller = getObj('player', msg.playerid);

        if (command == 'beyond') {
            let importData = '';
            if(args.length < 1) { sendHelpMenu(beyond_caller); return; }

            let config = state[state_name][beyond_caller.id].config;
            let initTiebreaker = config.initTieBreaker;
            let languageGrouping = config.languageGrouping;
            
            // if not set, we default to true even without a config reset
            if (config.hasOwnProperty('spellTargetInAttacks')) {
                spellTargetInAttacks = config.spellTargetInAttacks;
            }

            for(let i = 0; i < args.length; i+=2) {
                let k = args[i].trim();
                let v = args[i+1] != null ? args[i+1].trim() : null;

                switch(k) {
                    case 'help':
                        sendHelpMenu(beyond_caller);
                        return;

                    case 'reset':
                        state[state_name][beyond_caller] = {};
                        setDefaults(true);
                        sendConfigMenu(beyond_caller);
                        return;

                    case 'config':
                        if(args.length > 0){
                            let setting = v.split('|');
                            let key = setting.shift();
                            let value = (setting[0] === 'true') ? true : (setting[0] === 'false') ? false : (setting[0] === '[NONE]') ? '' : setting[0];

                            if(key === 'prefix' && value.charAt(0) !== '_' && value.length > 0) { value = value + ' ';}
                            if(key === 'suffix' && value.charAt(0) !== '_' && value.length > 0) { value = ' ' + value}

                            state[state_name][beyond_caller.id].config[key] = value;
                        }

                        sendConfigMenu(beyond_caller);
                        return;

                    case 'imports':
                        if(args.length > 0){
                            let setting = v.split('|');
                            let key = setting.shift();
                            let value = (setting[0] === 'true') ? true : (setting[0] === 'false') ? false : (setting[0] === '[NONE]') ? '' : setting[0];

                            state[state_name][beyond_caller.id].config.imports[key] = value;
                        }

                        sendConfigMenu(beyond_caller);
                        return;

                    case 'import':
                        importData = v;
                        break;

                    default:
                        sendHelpMenu(beyond_caller);
                        return;
                }
            }

            if(importData != '') {
                // REVISIT: maybe put this here?
                // sendChat(script_name, '<div style="'+style+'">Character sheet import started.<br><p>Please do not start additional imports until it completes.</p></div>', null, {noarchive:true});

                let json = importData;
                let character = JSON.parse(json).character;

                sendChat(script_name, '<div style="'+style+'">Import of <b>' + character.name + '</b> is starting.</div>', null, {noarchive:true});

                class_spells = [];

                // these are automatically sorted into attributes that are written individually, in alphabetical order
                // and other attributes that are then written as a bulk write, but all are written before repeating_attributes
                let single_attributes = {};

                // these are written in one large write once everything else is written
                // NOTE: changing any stats after all these are imported would create a lot of updates, so it is
                // good that we write these when all the stats are done
                let repeating_attributes = {};

                object = null;

                // Remove characters with the same name if overwrite is enabled.
                if(state[state_name][beyond_caller.id].config.overwrite) {
                    let objects = findObjs({
                        _type: "character",
                        name: state[state_name][beyond_caller.id].config.prefix + character.name + state[state_name][beyond_caller.id].config.suffix
                    }, {caseInsensitive: true});

                    if(objects.length > 0) {
                        object = objects[0];
                        for(let i = 1; i < objects.length; i++){
                            objects[i].remove();
                        }
                    }
                }

                if(!object) {
                    // Create character object
                    object = createObj("character", {
                        name: state[state_name][beyond_caller.id].config.prefix + character.name + state[state_name][beyond_caller.id].config.suffix,
                        inplayerjournals: playerIsGM(msg.playerid) ? state[state_name][beyond_caller.id].config.inplayerjournals : msg.playerid,
                        controlledby: playerIsGM(msg.playerid) ? state[state_name][beyond_caller.id].config.controlledby : msg.playerid
                    });
                }

                // base class, if set
                if (character.classes && (character.classes.length > 0)) {
                    Object.assign(single_attributes, {
                        'class': character.classes[0].definition.name,
                        'subclass': character.classes[0].subclassDefinition == null ? '' : character.classes[0].subclassDefinition.name,
                        'base_level': character.classes[0].level
                    });
                }
                
                // Make Speed String
                let weightSpeeds = character.race.weightSpeeds;
                if(weightSpeeds == null) {
                    weightSpeeds = {
                        "normal": {
                            "walk": 30,
                            "fly": 0,
                            "burrow": 0,
                            "swim": 0,
                            "climb": 0
                        }
                    };
                }

                let speedMods = getObjects(character.modifiers, 'subType', 'speed');
                if(speedMods != null) {
                    speedMods.forEach((speedMod) => {
                        // REVISIT: what item is this for?  boots of striding and springing use set: innate-speed-walking and Loadstone uses bonus: speed
                        // so maybe this is for some feat or class feature? we could scope the search to not the whole character to clarify this
                        if(speedMod.type == 'set') {
                            weightSpeeds.normal.walk = (speedMod.value > weightSpeeds.normal.walk ? speedMod.value : weightSpeeds.normal.walk);
                        }
                    });
                }

                speedMods = getObjects(character.modifiers, 'subType', 'innate-speed-flying');
                if(speedMods != null) {
                    speedMods.forEach((speedMod) => {
                        if(speedMod.type == 'set' && speedMod.id.indexOf('spell') == -1) {
                            if(speedMod.value == null) speedMod.value = weightSpeeds.normal.walk;
                            weightSpeeds.normal.fly = (speedMod.value > weightSpeeds.normal.fly ? speedMod.value : weightSpeeds.normal.fly);
                        }
                    });
                }

                speedMods = getObjects(character.modifiers, 'subType', 'innate-speed-swimming');
                if(speedMods != null) {
                    speedMods.forEach((speedMod) => {
                        if(speedMod.type == 'set' && speedMod.id.indexOf('spell') == -1) {
                            if(speedMod.value == null) speedMod.value = weightSpeeds.normal.walk;
                            weightSpeeds.normal.swim = (speedMod.value > weightSpeeds.normal.swim ? speedMod.value : weightSpeeds.normal.swim);
                        }
                    });
                }

                speedMods = getObjects(character.modifiers, 'subType', 'innate-speed-climbing');
                if(speedMods != null) {
                    speedMods.forEach((speedMod) => {
                        if(speedMod.type == 'set' && speedMod.id.indexOf('spell') == -1) {
                            if(speedMod.value == null) speedMod.value = weightSpeeds.normal.walk;
                            weightSpeeds.normal.climb = (speedMod.value > weightSpeeds.normal.climb ? speedMod.value : weightSpeeds.normal.climb);
                        }
                    });
                }

                speedMods = getObjects(character.modifiers, 'subType', 'unarmored-movement');
                if(speedMods != null) {
                    speedMods.forEach((speedMod) => {
                        if(speedMod.type == 'bonus') {
                            speedMod.value = isNaN(weightSpeeds.normal.walk + speedMod.value) ? 0 : speedMod.value;
                            weightSpeeds.normal.walk += speedMod.value;
                            if(weightSpeeds.normal.fly > 0) weightSpeeds.normal.fly += speedMod.value;
                            if(weightSpeeds.normal.swim > 0) weightSpeeds.normal.swim += speedMod.value;
                            if(weightSpeeds.normal.climb > 0) weightSpeeds.normal.climb += speedMod.value;
                        }
                    });
                }

                speedMods = getObjects(character.modifiers, 'subType', 'speed');
                if(speedMods != null) {
                    speedMods.forEach((speedMod) => {
                        if(speedMod.type == 'bonus') {
                            speedMod.value = isNaN(weightSpeeds.normal.walk + speedMod.value) ? 0 : speedMod.value;
                            weightSpeeds.normal.walk += speedMod.value;
                            if(weightSpeeds.normal.fly > 0) weightSpeeds.normal.fly += speedMod.value;
                            if(weightSpeeds.normal.swim > 0) weightSpeeds.normal.swim += speedMod.value;
                            if(weightSpeeds.normal.climb > 0) weightSpeeds.normal.climb += speedMod.value;
                        }
                    });
                }

                let speed = weightSpeeds.normal.walk + 'ft.';
                for(let key in weightSpeeds.normal){
                    if(key !== 'walk' && weightSpeeds.normal[key] !== 0){
                        speed += ', ' + key + ' ' + weightSpeeds.normal[key] + 'ft.';
                    }
                }

                let weapon_critical_range = 20;
                let critical_range = 20;

                // Languages
                if(state[state_name][beyond_caller.id].config.imports.languages) {
                    let languages = getObjects(character, 'type', 'language');
                    if(languageGrouping) {
                        let langs = [];
                        if(languages != null) {
                            languages.forEach((language) => {
                                langs.push(language.friendlySubtypeName);
                            });
                        }

                        let row = getRepeatingRowIds('proficiencies', 'prof_type', 'LANGUAGE')[0];

                        let attributes = {};
                        attributes["repeating_proficiencies_"+row+"_name"] = langs.join(', ');
                        attributes["repeating_proficiencies_"+row+"_prof_type"] = 'LANGUAGE';
                        attributes["repeating_proficiencies_"+row+"_options-flag"] = '0';

                        Object.assign(repeating_attributes, attributes);
                    }
                    else {
                        if(languages != null) {
                            languages.forEach((language) => {
                                let row = getRepeatingRowIds('proficiencies', 'name', language.friendlySubtypeName)[0];
                                let attributes = {};
                                attributes["repeating_proficiencies_"+row+"_name"] = language.friendlySubtypeName;
                                attributes["repeating_proficiencies_"+row+"_prof_type"] = 'LANGUAGE';
                                attributes["repeating_proficiencies_"+row+"_options-flag"] = '0';

                                Object.assign(repeating_attributes, attributes);
                            });
                        }
                    }
                }

                // Import Proficiencies
                const weapons = ['Club', 'Dagger', 'Greatclub', 'Handaxe', 'Javelin', 'Light hammer', 'Mace', 'Quarterstaff', 'Sickle', 'Spear', 'Crossbow, Light', 'Dart', 'Shortbow', 'Sling', 'Battleaxe', 'Flail', 'Glaive', 'Greataxe', 'Greatsword', 'Halberd', 'Lance', 'Longsword', 'Maul', 'Morningstar', 'Pike', 'Rapier', 'Scimitar', 'Shortsword', 'Trident', 'War pick', 'Warhammer', 'Whip', 'Blowgun', 'Crossbow, Hand', 'Crossbow, Heavy', 'Longbow', 'Net'];
                let proficiencies = getObjects(character, 'type', 'proficiency');
                let profs = [];
                if(proficiencies != null) {
                    proficiencies.forEach((prof) => {
                        let skill = prof.subType.replace(/-/g, '_');
                        if(skills.includes(skill)){
                            let attributes = {};
                            attributes[skill + '_prof'] = '(@{pb}*@{'+skill+'_type})';
                            Object.assign(single_attributes, attributes);
                        }
                        else if(state[state_name][beyond_caller.id].config.imports.proficiencies) {
                            if(profs.indexOf(prof.friendlySubtypeName) !== -1) return;
                            profs.push(prof.friendlySubtypeName);

                            let row = getRepeatingRowIds('proficiencies', 'name', prof.friendlySubtypeName)[0];

                            let attributes = {}
                            attributes["repeating_proficiencies_" + row + "_name"] = prof.friendlySubtypeName;
                            attributes["repeating_proficiencies_" + row + "_prof_type"] = (prof.subType.includes('weapon') || weapons.includes(prof.friendlySubtypeName)) ? 'WEAPON' : (prof.subType.includes('armor') || prof.subType.includes('shield')) ? 'ARMOR' : 'OTHER';
                            attributes["repeating_proficiencies_" + row + "_options-flag"] = '0';

                            Object.assign(repeating_attributes, attributes);
                        }
                    });
                }

                if(state[state_name][beyond_caller.id].config.imports.traits) {
                    // Background Feature
                    if(character.background.definition != null) {
                        let btrait = {
                            name: character.background.definition.featureName,
                            description: replaceChars(character.background.definition.featureDescription),
                            source: 'Background',
                            source_type: character.background.definition.name
                        }

                        let attrs = createRepeatingTrait(object, btrait);
                        Object.assign(repeating_attributes, attrs);
                    }
                    // Custom Background Feature
                    if(character.background.customBackground != null) {
                        if(character.background.customBackground.featuresBackground != null) {
                            let btrait = {
                                name: character.background.customBackground.featuresBackground.featureName,
                                description: replaceChars(character.background.customBackground.featuresBackground.featureDescription),
                                source: 'Background',
                                source_type: character.background.customBackground.name
                            };

                            let attrs = createRepeatingTrait(object, btrait);
                            Object.assign(repeating_attributes, attrs);
                        }
                    }
                    // Feats
                    character.feats.forEach((feat, fi) => {
                        let t = {
                            name: feat.definition.name,
                            description: replaceChars(feat.definition.description),
                            source: 'Feat',
                            source_type: feat.definition.name
                        };

                        let attrs = createRepeatingTrait(object, t, fi);
                        Object.assign(repeating_attributes, attrs);
                    });
                    // Race Features
                    if(character.race.racialTraits != null) {
                        let ti = 0;
                        character.race.racialTraits.forEach((trait) => {
                            if(['Languages', 'Darkvision', 'Superior Darkvision', 'Skills', 'Ability Score Increase', 'Feat', 'Age', 'Alignment', 'Size', 'Speed', 'Skill Versatility', 'Dwarven Combat Training', 'Keen Senses', 'Elf Weapon Training', 'Extra Language', 'Tool Proficiency'].indexOf(trait.definition.name) !== -1) {
                                return;
                            }

                            let description = '';
                            if(trait.options != null) {
                                trait.options.forEach((option) => {
                                    description += option.name + '\n';
                                    description += (option.description !== '') ? option.description + '\n\n' : '\n';
                                });
                            }

                            description += trait.definition.description;

                            let t = {
                                name: trait.definition.name,
                                description: replaceChars(description),
                                source: 'Race',
                                source_type: character.race.fullName
                            };

                            let attrs = createRepeatingTrait(object, t, ti);
                            Object.assign(repeating_attributes, attrs);

                            let spells = getFeatureSpells(character, trait.id, 'race');
                            spells.forEach((spell) => {
                                spell.spellCastingAbility = _ABILITIES[spell.spellCastingAbilityId];
                                class_spells.push(spell);
                            });

                            ti++;
                        });
                    }
                }

                // Handle (Multi)Class Features
                let multiclass_level = 0;
                let total_level = 0;
                let monk_level = 0;
                if(state[state_name][beyond_caller.id].config.imports.classes) {
                    let multiclasses = {};
                    character.classes.forEach((current_class, i) => {
                        total_level += current_class.level;

                        if(!current_class.isStartingClass){
                            multiclasses['multiclass'+i+'_flag'] = '1';
                            multiclasses['multiclass'+i+'_lvl'] = current_class.level;
                            multiclasses['multiclass'+i] = current_class.definition.name.toLowerCase();
                            multiclasses['multiclass'+i+'_subclass'] = current_class.subclassDefinition == null ? '' : current_class.subclassDefinition.name;
                            multiclass_level += current_class.level;
                        }

                        // Set Pact Magic as class resource
                        if(current_class.definition.name.toLowerCase() === 'warlock') {
                            let attributes = {}
                            attributes['other_resource_name'] = 'Pact Magic';
                            attributes['other_resource_max'] = getPactMagicSlots(current_class.level);
                            attributes['other_resource'] = getPactMagicSlots(current_class.level);
                            Object.assign(single_attributes, attributes);
                        }

                        if(current_class.definition.name == 'Monk') monk_level = current_class.level;

                        if(current_class.definition.name.toLowerCase() === 'fighter' && current_class.subclassDefinition != null) {
                            if(current_class.subclassDefinition.name.toLowerCase() == 'champion') {
                                current_class.subclassDefinition.classFeatures.forEach((feature, i) => {
                                    if(feature.id == 215 && current_class.level >= feature.requiredLevel) { // improved critical
                                        critical_range = Math.min(19, critical_range);
                                    }
                                    if(feature.id == 218 && current_class.level >= feature.requiredLevel) {
                                        critical_range = Math.min(18, critical_range);
                                    }
                                });
                            }
                        }

                        if(state[state_name][beyond_caller.id].config.imports.class_traits){
                            let ti = 0;
                            current_class.definition.classFeatures.forEach((trait) => {
                                if(silent_class_features.indexOf(trait.name) !== -1) {
                                    return;
                                }
                                if(option_class_features.indexOf(trait.name) !== -1) {
                                    ti = importClassOptions(repeating_attributes, trait, current_class, character.options.class, ti);
                                    return;
                                }
                                if(trait.requiredLevel > current_class.level) return;

                                if(trait.name.includes('Jack')){
                                    jack = '@{jack}';
                                }

                                let description = '';

                                description += trait.description;

                                let t = {
                                    name: trait.name,
                                    description: replaceChars(description),
                                    source: 'Class',
                                    source_type: current_class.definition.name
                                };

                                Object.assign(repeating_attributes, createRepeatingTrait(object, t, ti));

                                let spells = getFeatureSpells(character, trait.id, 'class');
                                spells.forEach((spell) => {
                                    spell.spellCastingAbility = _ABILITIES[spell.spellCastingAbilityId];
                                    class_spells.push(spell);
                                });

                                if(trait.name == 'Metamagic') {
                                    character.choices.class.forEach((option) => {
                                        if(option.type == 3 && (option.optionValue >= 106 && option.optionValue <= 113)) {
                                            let item = getObjects(option.options, 'id', option.optionValue);

                                            if(item.length > 0) {
                                                item = item[0];
                                                let o = {
                                                    name: item.label,
                                                    description: item.description,
                                                    source: 'Class',
                                                    source_type: current_class.definition.name
                                                };

                                                Object.assign(repeating_attributes, createRepeatingTrait(object, o));
                                            }
                                        }
                                    });
                                }

                                ti++;
                            });

                            if(current_class.subclassDefinition != null) {
                                let ti = 0;
                                current_class.subclassDefinition.classFeatures.forEach((trait) => {
                                    if(silent_class_features.indexOf(trait.name) !== -1) {
                                        return;
                                    }
                                    if(option_class_features.indexOf(trait.name) !== -1) {
                                        ti = importClassOptions(repeating_attributes, trait, current_class, character.options.class, ti);
                                        return;
                                    }
                                    if(trait.requiredLevel > current_class.level) return;

                                    if(trait.name.includes('Jack')){
                                        jack = '@{jack}';
                                    }

                                    let description = '';

                                    description += trait.description;

                                    let t = {
                                        name: trait.name,
                                        description: replaceChars(description),
                                        source: 'Class',
                                        source_type: current_class.definition.name
                                    }

                                    Object.assign(repeating_attributes, createRepeatingTrait(object, t, ti));

                                    let spells = getFeatureSpells(character, trait.id, 'class');
                                    spells.forEach((spell) => {
                                        spell.spellCastingAbility = _ABILITIES[spell.spellCastingAbilityId];
                                        class_spells.push(spell);
                                    });

                                    ti++;
                                });
                            }
                        }

                        // Class Spells
                        if(state[state_name][beyond_caller.id].config.imports.class_spells){
                            for(let i in character.classSpells) {
                                let spells = character.classSpells[i];
                                if(character.classSpells[i].characterClassId == current_class.id) {
                                    character.classSpells[i].spells.forEach((spell) => {
                                        spell.spellCastingAbility = _ABILITIES[current_class.definition.spellCastingAbilityId];
                                        class_spells.push(spell);
                                    });
                                }
                            }
                        }
                    });
                    Object.assign(single_attributes, multiclasses);
                }

                // Import Character Inventory
                let hasArmor = false;
                if(state[state_name][beyond_caller.id].config.imports.inventory) {
                    // accumulate unique fighting styles selected
                    let fightingStylesSelected = new Set()
                    let fightingStyles = getObjects(character.classes, 'name', 'Fighting Style');
                    fightingStyles.forEach((fS) => {
                        let fsOpts = getObjects(character.choices, 'componentId', fS.id);
                        fsOpts.forEach((fsOpt) => {
                            if(fsOpt.optionValue != null) {
                                let selOpts = getObjects(fsOpt.options, 'id', fsOpt.optionValue);
                                selOpts.forEach((selOpt) => {
                                    fightingStylesSelected.add(selOpt.label)
                                });
                            }
                        });
                    });

                    const inventory = character.inventory;
                    let prevAdded = [];
                    if(inventory != null) {
                        let shieldEquipped = false;
                        inventory.forEach((item, i) => {
                            if(item.definition.type == 'Shield' && item.equipped) shieldEquipped = true;
                        });
                        inventory.forEach((item, i) => {
                            log('beyond: found inventory item ' + item.definition.name);
                            let paIndex = prevAdded.filter((pAdded) => { return pAdded == item.definition.name; }).length;
                            let row = getRepeatingRowIds('inventory', 'itemname', item.definition.name, paIndex);
                            prevAdded.push(item.definition.name);

                            let attributes = {};
                            attributes["repeating_inventory_"+row+"_itemname"] = item.definition.name;
                            attributes["repeating_inventory_"+row+"_equipped"] = (item.equipped) ? '1' : '0';
                            attributes["repeating_inventory_"+row+"_itemcount"] = item.quantity;
                            attributes["repeating_inventory_"+row+"_itemweight"] = (item.definition.bundleSize != 0 ? item.definition.weight / item.definition.bundleSize : item.definition.weight);
                            attributes["repeating_inventory_"+row+"_itemcontent"] = replaceChars(item.definition.description);
                            let _itemmodifiers = 'Item Type: ' + item.definition.type;
                            if(typeof item.definition.damage === 'object' && item.definition.type !== 'Ammunition') {
                                let properties = '';
                                let finesse = false;
                                let twohanded = false;
                                let ranged = false;
                                let hasOffhand = false;
                                let isOffhand = false;
                                let versatile = false;
                                let versatileDice = '';
                                item.definition.properties.forEach((prop) => {
                                    if(prop.name == 'Two-Handed') {
                                        twohanded = true;
                                    }
                                    if(prop.name == 'Range') {
                                        ranged = true;
                                    }
                                    if(prop.name == 'Finesse') {
                                        finesse = true;
                                    }
                                    if(prop.name == 'Versatile') {
                                        versatile = true;
                                        versatileDice = prop.notes;
                                    }

                                    properties += prop.name + ', ';
                                });

                                let cv = getObjects(character.characterValues, 'valueTypeId', item.entityTypeId);
                                cv.forEach((v) => {
                                    if(v.typeId == 18 && v.value === true) {
                                        hasOffhand = true;
                                        if(v.valueId == item.id) {
                                            isOffhand = true;
                                        }
                                    }
                                });

                                attributes["repeating_inventory_"+row+"_itemproperties"] = properties;
                                attributes["repeating_inventory_"+row+"_hasattack"] = '0';
                                _itemmodifiers = 'Item Type: ' + item.definition.attackType + ' ' + item.definition.filterType + (item.definition.damage != null ? ', Damage: ' + item.definition.damage.diceString : '') + ', Damage Type: ' + item.definition.damageType + ', Range: ' + item.definition.range + '/' + item.definition.longRange;

                                let magic = 0;
                                item.definition.grantedModifiers.forEach((grantedMod) => {
                                    if(grantedMod.type == 'bonus' && grantedMod.subType == 'magic') {
                                        magic += grantedMod.value;
                                    }
                                });

                                // Finesse Weapon
                                let isFinesse = item.definition.properties.filter((property) => { return property.name == 'Finesse'; }).length > 0;
                                if(isFinesse && getTotalAbilityScore(character, 2) > getTotalAbilityScore(character, item.definition.attackType)) {
                                    item.definition.attackType = 2;
                                }

                                // Hexblade's Weapon
                                let characterValues = getObjects(character.characterValues, 'valueId', item.id);
                                characterValues.forEach((cv) => {
                                    if(cv.typeId == 29 && getTotalAbilityScore(character, 6) >= getTotalAbilityScore(character, item.definition.attackType)) {
                                        item.definition.attackType = 6;
                                    }
                                });

                                let gwf = false;
                                let atkmod = 0;
                                let dmgmod = 0;
                                let hasTWFS = false;

                                // process each fighting style only once
                                fightingStylesSelected.forEach((fightingStyle) => {
                                    if(fightingStyle == 'Great Weapon Fighting' && twohanded && (!ranged)) {
                                        gwf = true;
                                    }
                                    if(fightingStyle == 'Archery' && ranged) {
                                        atkmod += 2;
                                    }
                                    if(fightingStyle== 'Dueling' && !(hasOffhand || ranged || twohanded)) {
                                        log('applying Dueling +2 to ' + item.definition.name)
                                        dmgmod += 2;
                                        log('damage mod now ' + dmgmod)
                                    }
                                    if(fightingStyle == 'Two-Weapon Fighting') {
                                        hasTWFS = true;
                                    }
                                });

                                if(versatile && !(hasOffhand || shieldEquipped)) {
                                    item.definition.damage.diceString = versatileDice;
                                }

                                if(item.definition.isMonkWeapon && monk_level > 0) {
                                    let itemAvgDmg = 0;
                                    if(item.definition.damage != null) {
                                        let dS = item.definition.damage.diceString;
                                        let itemDieCount = parseInt(dS.substr(0, dS.indexOf('d')));
                                        let itemDieSize = parseInt(dS.substr(dS.indexOf('d')+1));
                                        itemAvgDmg = (itemDieCount * (itemDieSize + 1)) / 2;
                                    }

                                    let monkDieSize = Math.floor((monk_level - 1) / 4) * 2 + 4;
                                    let monkAvgDmg = (1 + monkDieSize) / 2;

                                    if(monkAvgDmg > itemAvgDmg) {
                                        item.definition.damage.diceString = '1d'+monkDieSize;
                                    }

                                    let str = getTotalAbilityScore(character, 1);
                                    let dex = getTotalAbilityScore(character, 2);
                                    if(dex > str) {
                                        item.definition.attackType = 2;
                                    }
                                }

                                let dmgattr = _ABILITY[_ABILITIES[item.definition.attackType]];
                                if(!hasTWFS && isOffhand) dmgattr = '0';

                                // CREATE ATTACK
                                let attack = {
                                    name: item.definition.name,
                                    range: item.definition.range + (item.definition.range != item.definition.longRange ? '/' + item.definition.longRange : '') + 'ft.',
                                    attack: {
                                        attribute: _ABILITY[_ABILITIES[item.definition.attackType]],
                                        mod: atkmod
                                    },
                                    damage: {
                                        diceString: item.definition.damage != null ? item.definition.damage.diceString + (gwf ? 'ro<2' : '') : '',
                                        type: item.definition.damageType,
                                        attribute: dmgattr,
                                        mod: dmgmod
                                    },
                                    description: replaceChars(item.definition.description),
                                    magic: magic,
                                    critrange: Math.min(weapon_critical_range, critical_range)
                                };

                                item.definition.grantedModifiers.forEach((grantedMod) => {
                                    if(grantedMod.type == 'damage') {
                                        if(grantedMod.dice != null) {
                                            attack.damage2 = {
                                                diceString: grantedMod.dice.diceString,
                                                type: grantedMod.friendlySubtypeName,
                                                attribute: grantedMod.statId == null ? '0' : _ABILITY[_ABILITIES[grantedMod.statId]]
                                            };
                                        }
                                    }
                                });

                                let repAttack = createRepeatingAttack(object, attack, {index: paIndex, itemid: row});
                                Object.assign(repeating_attributes, repAttack);
                                // /CREATE ATTACK
                            }
                            let itemArmorClass = 0;
                            itemArmorClass += (item.definition.armorClass == null ? 0 : item.definition.armorClass);
                            item.definition.grantedModifiers.forEach((grantedMod) => {
                                for(let abilityId in _ABILITIES) {
                                    let ABL = _ABILITIES[abilityId];
                                    if(grantedMod.type == 'set' && grantedMod.subType == _ABILITY[ABL]+'-score') {
                                        _itemmodifiers += ', '+ucFirst(_ABILITY[ABL])+': '+grantedMod.value;
                                    }
                                }
                                if(grantedMod.type == 'bonus') {
                                    switch (grantedMod.subType) {
                                        case 'armor-class':
                                            // wielding a shield or wearing other item which only give a bonus to armor class doesn't qualify as wearing armor
                                            // including items such as staff of power, ring of protection, etc.
                                            // fall through
                                        case 'unarmored-armor-class':
                                            if(item.definition.hasOwnProperty('armorClass')) {
                                                itemArmorClass += grantedMod.value;
                                            }
                                            else {
                                                _itemmodifiers += ', AC +' + grantedMod.value;
                                            }
                                            break;
                                        case 'saving-throws':
                                            _itemmodifiers += ', Saving Throws +' + grantedMod.value;
                                            break;
                                        case 'ability-checks':
                                            _itemmodifiers += ', Ability Checks +' + grantedMod.value;
                                            break;
                                        case 'speed':
                                            // Speed attribute in Roll20 OGL sheets is not calculated. They must be manually set
                                            break;
                                        case 'magic':
                                            // these are picked up in the weapons code above
                                            break;
                                        default:
                                            // these may indicate an unimplemented conversion
                                            log('ignoring item ' + item.definition.name + ' bonus modifier for ' + grantedMod.subType);
                                    }
                                }
                                if(grantedMod.type == 'set') {
                                    switch (grantedMod.subType) {
                                        case 'armor-class':
                                            // If an item qualifies as armor, it will be given the .armorClass property and a type property of "Light/Medium/Heavy Armor".
                                            // Items with modifiers like this don't qualify as armor. I don't know of any items that have this specific modifier.
                                            // fall through
                                        case 'unarmored-armor-class':
                                            _itemmodifiers += ', AC: ' + grantedMod.value;
                                            break;
                                        case 'innate-speed-walking':
                                            // REVISIT boots of striding and springing give a floor to walking speed through this, but no way to do that in an item in Roll20?
                                            // fall through and log as ignored
                                        default:
                                            // these may indicate an unimplemented conversion
                                            log('ignoring item ' + item.definition.name + ' set modifier for ' + grantedMod.subType);
                                    }
                                }
                            });
                            if(item.definition.hasOwnProperty('armorClass')) {
                                let ac = itemArmorClass;
                                if(["Light Armor", "Medium Armor", "Heavy Armor"].indexOf(item.definition.type) >= 0) {
                                    // This includes features such as defense fighting style, which require the user to wear armor
                                    let aac = getObjects(character, 'subType', 'armored-armor-class');
                                    aac.forEach((aacb) => {
                                        ac = parseInt(ac) + parseInt(aacb.value);
                                    });
                                    hasArmor = true;
                                }
                                _itemmodifiers += ', AC: ' + ac;
                            }
                            attributes["repeating_inventory_"+row+"_itemmodifiers"] = _itemmodifiers;
                            Object.assign(repeating_attributes, attributes);
                        });
                    }
                }

                // If character has unarmored defense, add it to the inventory, so a player can enable/disable it.
                let unarmored = getObjects(character.modifiers, 'subType', 'unarmored-armor-class', ['item']);
                let x = 0;
                if(unarmored != null) unarmored.forEach((ua, i) => {
                    if(ua.type != 'set') return;
                    if(ua.value == null) {
                        ua.value = Math.floor((getTotalAbilityScore(character, ua.statId) - 10) / 2);
                    }

                    let row = getRepeatingRowIds('inventory', 'itemname', 'Unarmored Defense')[x];

                    let name = 'Unarmored Defense';
                    let modifiers = '';

                    // Label the unarmored armor class based on the feature it originates from
                    character.classes.forEach((charClass) => {
                        charClass.definition.classFeatures.filter(cF => cF.id == ua.componentId).forEach((cF) => {
                            name = cF.name;
                        });
                        if(charClass.subclassDefinition != null) {
                            charClass.subclassDefinition.classFeatures.filter(cF => cF.id == ua.componentId).forEach((cF) => {
                                name = cF.name;
                            });
                        }
                    });
                    character.race.racialTraits.filter(rT => rT.id == ua.componentId).forEach((rT) => {
                        name = rT.name;
                    })

                    if(ua.componentTypeId == 306912077) { // Integrated Protection (Armor Type Option)
                        row = getRepeatingRowIds('inventory', 'itemname', 'Integrated Potection', 0);

                        name = 'Integrated Protection';
                        hasArmor = false;
                        if(ua.value == 6) {
                            modifiers = 'Item Type: Heavy Armor';
                            ua.value = 10 + parseInt(ua.value);
                        }
                        else if(ua.value == 3) {
                            modifiers == 'Item Type: Medium Armor'
                            ua.value = 10 + parseInt(ua.value);
                        }
                        ua.value += Math.floor((total_level - 1) / 4) + 2;
                    }

                    modifiers += (modifiers == '' ? '' : ', ') + 'AC: '+ua.value

                    let attributes = {}
                    attributes["repeating_inventory_"+row+"_itemname"] = name;
                    attributes["repeating_inventory_"+row+"_equipped"] = !hasArmor ? '1' : '0';
                    attributes["repeating_inventory_"+row+"_itemcount"] = 1;
                    attributes["repeating_inventory_"+row+"_itemmodifiers"] = modifiers;
                    Object.assign(repeating_attributes, attributes);

                    if(ua.componentTypeId == 306912077) { hasArmor = true; }

                    x++;
                });

                if(character.spells.race.length > 0) {
                    let spells = character.spells.race;
                    spells.forEach((spell) => {
                        spell.spellCastingAbility = _ABILITIES[spell.spellCastingAbilityId];
                        class_spells.push(spell);
                    });
                }

                //Skill Bonuses and Half Proficiencies
                let bonuses = getObjects(character.modifiers, 'type', 'bonus').filter(bonus => skills.includes(bonus.subType.replace(/-/g, '_')) && !bonus.id.includes('spell'));
                let bonus_attributes = {};
                bonuses.forEach((bonus) => {
                    bonus_attributes[type + '_flat'] = bonus.value;
                });
                Object.assign(single_attributes, bonus_attributes);

                skills.forEach((skill) => {
                    let skill_prof = getObjects(proficiencies, 'subType', skill.replace(/_/g, '-'));
                    if(skill_prof.length == 0) {
                        let hpModifiers = getObjects(character.modifiers, 'type', 'half-proficiency');
                        let hprModifiers = getObjects(character.modifiers, 'type', 'half-proficiency-round-up');
                        if(hprModifiers.length > 0) {
                            hprModifiers.forEach((modifier) => {
                                if(
                                    modifier.subType == 'ability-checks'
                                    || (modifier.subType == 'strength-ability-checks' && strength_skills.includes(skill))
                                    || (modifier.subType == 'dexterity-ability-checks' && dexterity_skills.includes(skill))
                                    || (modifier.subType == 'intelligence-ability-checks' && intelligence_skills.includes(skill))
                                    || (modifier.subType == 'wisdom-ability-checks' && wisdom_skills.includes(skill))
                                    || (modifier.subType == 'charisma-ability-checks' && charisma_skills.includes(skill))
                                ) {
                                    let attributes = {};
                                    attributes[skill + "_flat"] = Math.ceil((Math.floor((total_level - 1) / 4) + 2) / 2);
                                    Object.assign(single_attributes, attributes);
                                }
                            });
                        }
                        else if(hpModifiers.length > 0) {
                            hpModifiers.forEach((modifier) => {
                                if(
                                    modifier.subType == 'ability-checks'
                                    || (modifier.subType == 'strength-ability-checks' && strength_skills.includes(skill))
                                    || (modifier.subType == 'dexterity-ability-checks' && dexterity_skills.includes(skill))
                                    || (modifier.subType == 'intelligence-ability-checks' && intelligence_skills.includes(skill))
                                    || (modifier.subType == 'wisdom-ability-checks' && wisdom_skills.includes(skill))
                                    || (modifier.subType == 'charisma-ability-checks' && charisma_skills.includes(skill))
                                ) {
                                    let attributes = {};
                                    attributes[skill + "_flat"] = Math.floor((Math.floor((total_level - 1) / 4) + 2) / 2);
                                    Object.assign(single_attributes, attributes);
                                }
                            });
                        }
                    }
                });

                let hpModifiers = getObjects(character.modifiers, 'type', 'half-proficiency');
                let hprModifiers = getObjects(character.modifiers, 'type', 'half-proficiency-round-up');
                if(hprModifiers.length > 0) {
                    hprModifiers.forEach((modifier) => {
                        if(modifier.subType == 'initiative') {
                            let attributes = {};
                            attributes["initmod"] = Math.ceil((Math.floor((total_level - 1) / 4) + 2) / 2);
                            Object.assign(single_attributes, attributes);
                        }
                    });
                }
                else if(hpModifiers.length > 0) {
                    hpModifiers.forEach((modifier) => {
                        if(modifier.subType == 'initiative') {
                            let attributes = {};
                            attributes["initmod"] = Math.floor((Math.floor((total_level - 1) / 4) + 2) / 2);
                            Object.assign(single_attributes, attributes);
                        }
                    });
                }

                // Expertise
                let exp = getObjects(character, 'type', 'expertise');
                for(let i in exp) {
                    let expertise = exp[i];
                    let type = expertise.subType.replace(/-/g, '_');
                    if(skills.includes(type)){
                        let attributes = {};
                        attributes[type + '_type'] = "2";
                        Object.assign(single_attributes, attributes);
                    }

                    if(expertise.subType === 'thieves-tools') {
                        let row = getRepeatingRowIds('proficiencies', 'name', expertise.friendlySubtypeName)[0];

                        let attributes = {}
                        attributes["repeating_proficiencies_"+row+"_name"] = expertise.friendlySubtypeName;
                        attributes["repeating_proficiencies_"+row+"_prof_type"] = 'OTHER';
                        attributes["repeating_proficiencies_"+row+"_options-flag"] = '0';
                        Object.assign(repeating_attributes, attributes);
                    }
                }

                // Adhoc Expertise
                let characterValues = getObjects(character.characterValues, 'typeId', 26);
                characterValues.forEach((cv) => {
                    let attributes = {};
                    if(cv.value == 4) {
                        let objs = getObjects(character, 'type', 'proficiency');
                        objs.forEach((obj) => {
                            if(cv.valueId == obj.entityId && cv.valueTypeId == obj.entityTypeId) {
                                let type = obj.subType.replace(/-/g, '_');
                                if(skills.includes(type)){
                                    attributes[type + '_type'] = "2";
                                }
                            }
                        });
                    }
                    Object.assign(single_attributes, attributes);
                });

                // Initiative Style
                let init_mods = getObjects(character.modifiers, 'subType', 'initiative');

                let init_style = '@{d20}';
                let initadv = init_mods.filter(im => im.type == 'advantage').length > 0;
                let initdis = init_mods.filter(im => im.type == 'disadvantage').length > 0;
                if(initadv && !initdis) init_style = '{@{d20},@{d20}}kh1';
                if(!initadv && initdis) init_style = '{@{d20},@{d20}}kl1';

                let initbon = 0;
                init_mods.filter(im => im.type == 'bonus').forEach((bonus) => {
                    if(bonus.statId != null) {
                        initbon += Math.floor((getTotalAbilityScore(character, bonus.statId) - 10) / 2);
                    }
                    if(bonus.value != null) {
                        initbon += bonus.value;
                    }
                });

                // Saving Throw Bonuses and proficiencies
                let stBonuses = getObjects(character.modifiers, 'subType', 'saving-throws', ['item']);
                let stBonTotals = [0,0,0,0,0,0,0];
                stBonuses.forEach((bonus) => {
                    if(bonus.statId != null) {
                        stBonTotals[0] += Math.floor((getTotalAbilityScore(character, bonus.statId) - 10) / 2);
                    }
                    if(bonus.value != null) {
                        stBonTotals[0] += bonus.value;
                    }
                    if(bonus.type == 'proficiency') {
                        // proficiency in all saves, such as Monk level 14 feature
                        for(let ability of Object.values(_ABILITY)) {
                            single_attributes[ability + '_save_prof'] = "(@{pb})";
                        }
                    }
                });
                for(let i in _ABILITIES) {
                    let abl = _ABILITY[_ABILITIES[i]];
                    let stBonuses = getObjects(character.modifiers, 'subType', abl+'-saving-throws', ['item']);
                    stBonuses.forEach((bonus) => {
                        if(bonus.statId != null) {
                            stBonTotals[parseInt(i)] += Math.floor((getTotalAbilityScore(character, bonus.statId) - 10) / 2);
                        }
                        if(bonus.value != null) {
                            stBonTotals[parseInt(i)] += bonus.value;
                        }
                        if(bonus.type == 'proficiency') {
                            single_attributes[abl + '_save_prof'] = "(@{pb})";
                        }
                    });
                }

                let contacts = '',
                    treasure = '',
                    otherNotes = '';
                if(state[state_name][beyond_caller.id].config.imports.notes){
                    contacts += (character.notes.allies) ? 'ALLIES:\n' + character.notes.allies + '\n\n' : '';
                    contacts += (character.notes.organizations) ? 'ORGANIZATIONS:\n' + character.notes.organizations + '\n\n' : '';
                    contacts += (character.notes.enemies) ? 'ENEMIES:\n' + character.notes.enemies : '';

                    treasure += (character.notes.personalPossessions) ? 'PERSONAL POSSESSIONS:\n' + character.notes.personalPossessions + '\n\n' : '';
                    treasure += (character.notes.otherHoldings) ? 'OTHER HOLDINGS:\n' + character.notes.otherHoldings : '';

                    otherNotes += (character.notes.otherNotes) ? 'OTHER NOTES:\n' + character.notes.otherNotes + '\n\n' : '';
                    otherNotes += (character.faith) ? 'FAITH: ' + character.faith + '\n' : '';
                    otherNotes += (character.lifestyle) ? 'Lifestyle: ' + character.lifestyle.name + ' with a ' + character.lifestyle.cost + ' cost.' : '';
                }

                let background = '';
                if(character.background.definition != null) background = character.background.definition.name;
                if(background == '' && character.background.customBackground.name != null) background = character.background.customBackground.name;

                let other_attributes = {
                    // Base Info
                    'level': character.classes[0].level + multiclass_level,
                    'experience': character.currentXp,
                    'race': (character.race.baseName || character.race.fullName),
                    'subrace': character.race.subRaceShortName,
                    'background': background,
                    'speed': speed,
                    'hp_temp': character.temporaryHitPoints || '',
                    'inspiration': (character.inspiration) ? 'on' : 0,
                    'alignment': character.alignmentId == null ? '' : alignments[character.alignmentId],

                    // Bio Info
                    'age': (character.age || ''),
                    'size': (character.size || ''),
                    'height': (character.height || ''),
                    'weight': (character.weight || ''),
                    'eyes': (character.eyes || ''),
                    'hair': (character.hair || ''),
                    'skin': (character.skin || ''),
                    'character_appearance': (character.traits.appearance || ''),

                    // Ability Scores
                    'strength_base': getTotalAbilityScore(character, 1),
                    'dexterity_base': getTotalAbilityScore(character, 2),
                    'constitution_base': getTotalAbilityScore(character, 3),
                    'intelligence_base': getTotalAbilityScore(character, 4),
                    'wisdom_base': getTotalAbilityScore(character, 5),
                    'charisma_base': getTotalAbilityScore(character, 6),

                    // Saving Throw Bonuses
                    'globalsavemod': stBonTotals[0],
                    'strength_save_mod': stBonTotals[1],
                    'dexterity_save_mod': stBonTotals[2],
                    'constitution_save_mod': stBonTotals[3],
                    'intelligence_save_mod': stBonTotals[4],
                    'wisdom_save_mod': stBonTotals[5],
                    'charisma_save_mod': stBonTotals[6],

                    // Traits
                    'personality_traits': character.traits.personalityTraits,
                    'options-flag-personality': '0',
                    'ideals': character.traits.ideals,
                    'options-flag-ideals': '0',
                    'bonds': character.traits.bonds,
                    'options-flag-bonds': '0',
                    'flaws': character.traits.flaws,
                    'options-flag-flaws': '0',

                    // currencies
                    'cp': character.currencies.cp,
                    'sp': character.currencies.sp,
                    'gp': character.currencies.gp,
                    'ep': character.currencies.ep,
                    'pp': character.currencies.pp,

                    // Notes/Bio
                    'character_backstory': character.notes.backstory,
                    'allies_and_organizations': contacts,
                    'additional_feature_and_traits': otherNotes,
                    'treasure': treasure,

                    'global_save_mod_flag': 1,
                    'global_skill_mod_flag': 1,
                    'global_attack_mod_flag': 1,
                    'global_damage_mod_flag': 1,
                    'dtype': 'full',
                    'init_tiebreaker': initTiebreaker ? '@{dexterity}/100' : '',
                    'initiative_style': init_style,
                    'initmod': initbon,
                    // 'jack_of_all_trades': jack
                };

                Object.assign(single_attributes, other_attributes);

                // XXX what is the status of these?
                // Object.assign(single_attributes, bonus_attributes);

                // these do not need to be written carefully, because they aren't looked at until the sheet is opened
                Object.assign(single_attributes, {
                    // prevent upgrades, because they recalculate the class (saves etc.)
                    'version': '2.5',

                    // prevent character mancer from doing anything
                    'l1mancer_status': 'complete',
                    'mancer_cancel': 'on'
                });

                // make work queue
                let items = createSingleWriteQueue(single_attributes);
                processItem(character, items, single_attributes, repeating_attributes, total_level)
            }
        }
    });

    const createSingleWriteQueue = (attributes) => {
        // this is the list of trigger attributes that will trigger class recalculation, as of 5e OGL 2.5 October 2018
        // (see on... handler that calls update_class in sheet html)
        // these are written first and individually, since they trigger a lot of changes
        let class_update_triggers = [
            'class', // NOTE: MUST be first because of shift below
            'custom_class', 
            'cust_classname', 
            'cust_hitdietype', 
            'cust_spellcasting_ability', 
            'cust_spellslots', 
            'cust_strength_save_prof', 
            'cust_dexterity_save_prof', 
            'cust_constitution_save_prof', 
            'cust_intelligence_save_prof', 
            'cust_wisdom_save_prof', 
            'cust_charisma_save_prof', 
            'subclass', 
            'multiclass1', 
            'multiclass1_subclass', 
            'multiclass2', 
            'multiclass2_subclass', 
            'multiclass3', 
            'multiclass3_subclass'];

        // set class first, everything else is alphabetical
        let classAttribute = class_update_triggers.shift();
        class_update_triggers.sort();
        class_update_triggers.unshift(classAttribute);

        // write in deterministic order (class first, then alphabetical)
        let items = [];
        for (trigger of class_update_triggers) {
            let value = attributes[trigger];
            if ((value === undefined) || (value === null)) {
                continue;
            }
            items.push([trigger, value]);
            log('beyond: trigger attribute ' + trigger);
            delete attributes[trigger];
        }
        return items;
    }
    
    const processItem = (character, items, single_attributes, repeating_attributes, total_level) => {
        let nextItem = items.shift();

        if (!nextItem) {
            // do one giant write for all the single attributes, before we create a bunch of attacks 
            // and other things that depend on stat changes
            setAttrs(object.id, single_attributes);

            // do one giant write for all the repeating attributes
            setAttrs(object.id, repeating_attributes);

            // configure HP, because we now know our CON score
            loadHitPoints(character, total_level);

            if(class_spells.length > 0 && state[state_name][beyond_caller.id].config.imports.class_spells) {
                sendChat(script_name, '<div style="'+style+'">Import of <b>' + character.name + '</b> is almost ready.<br />Class spells are being imported over time.</div>', null, {noarchive:true});

                // this is really just artificially asynchronous, we are not currently using a worker, so it will happen as soon as we return
                onSheetWorkerCompleted(() => {
                    importSpells(character, class_spells);
                })
            } else {
                reportReady(character);
            }
            return
        }

        // create empty attribute if not already there
        let nextAttribute = findObjs({ type: 'attribute', characterid: object.id, name: nextItem[0] })[0];
        nextAttribute = nextAttribute || createObj('attribute', { name: nextItem[0], characterid: object.id });

        // async load next item
        onSheetWorkerCompleted(function() {
            processItem(character, items, single_attributes, repeating_attributes, total_level);
        });
        log('beyond: ' + nextItem[0] + " = " + String(nextItem[1]));
        nextAttribute.setWithWorker({ current: nextItem[1] });
    }

    const loadHitPoints = (character, total_level) => {
        let hp = Math.floor(character.baseHitPoints + ( total_level * Math.floor( ( ( getTotalAbilityScore(character, 3) - 10 ) / 2 ) ) ) );

        // scan for modifiers except those in items, because we will get those bonuses from the items once they are imported
        // NOTE: this also handles the problem that Beyond includes modifiers from items that are not currently equipped/attuned
        let hpLevelBonus = getObjects(character.modifiers, 'subType', 'hit-points-per-level', ['item']).forEach((bonus) => {
            let level = total_level;

            // Ensure that per-level bonuses from class features only apply for the levels of the class and not the character's total level.
            let charClasses = character.classes.filter((charClass) => {
                let output = charClass.definition.classFeatures.findIndex(cF => cF.id == bonus.componentId) >= 0;
                if(charClass.subclassDefinition != null) {
                    output = output || charClass.subclassDefinition.classFeatures.findIndex(cF => cF.id == bonus.componentId) >= 0;
                }
                return output;
            });

            if(charClasses.length > 0) {
                level = 0;
                charClasses.forEach((charClass) => {
                    level += parseInt(charClass.level);
                });
            }

            hp += level * bonus.value;
        });

        let hpAttr = findObjs({ type: 'attribute', characterid: object.id, name: 'hp' })[0];
        if(hpAttr == null) {
            createObj('attribute', {
                characterid: object.id,
                name: 'hp',
                current: hp,
                max: hp
            });
        } else {
            hpAttr.set('current', hp);
            hpAttr.set('max', hp);
        }
    }

    const getPactMagicSlots = (level) => {
        switch(level){
            case 1:
                return 1;
                break;

            case 2: case 3: case 4: case 5: case 6: case 7: case 8: case 9: case 10:
            return 2;
            break;

            case 11: case 12: case 13: case 14: case 15: case 16:
            return 3;
            break;

            default:
                return 4
                break;
        }
        return 0;
    };

    const reportReady = (character) => {
        // TODO this is nonsense.  we aren't actually done importing, because notifications in the character sheet are firing for quite a while
        // after we finish changing things (especially on first import) and we have no way (?) to wait for it to be done.   These are not sheet workers
        // on which we can wait.
        sendChat(script_name, '<div style="'+style+'">Import of <b>' + character.name + '</b> is ready at https://journal.roll20.net/character/' + object.id +'</div>', null, {noarchive:true});
    }

    const getFeatureSpells = (character, traitId, featureType) => {
        let spellsArr = [];
        if(character.spells[featureType] == null) return spellsArr;
        if(character.spells[featureType].length > 0) {
            let options = getObjects(character.options[featureType], 'componentId', traitId);
            for(let i = 0; i < options.length; i++) {
                let spells = getObjects(character.spells[featureType], 'componentId', options[i].definition.id);
                for(let j = 0; j < spells.length; j++) {
                    spellsArr.push(spells[j])
                }
            }
        }
        return spellsArr;
    };

    const importSpells = (character, spells) => {
        // set this to whatever number of items you can process at once
        // return attributes;
        spellAttacks = [];
        let chunk = 5;
        let index = 0;
        function doChunk() {
            let cnt = chunk;
            let attributes = {};
            while (cnt-- && index < spells.length) {
                Object.assign(attributes, importSpell(character, spells, index, true));
                ++index;
            }
            setAttrs(object.id, attributes);
            if (index < spells.length) {
                // set Timeout for async iteration
                onSheetWorkerCompleted(doChunk);
            } else {
                log('beyond: spells imported, updating spell attack proficiency');
                onSheetWorkerCompleted(() => { updateSpellAttackProf(character, 0); });
            }
        }
        doChunk();
    };

    const updateSpellAttackProf = (character, i) => {
        if(spellAttacks[i] == null) {
            reportReady(character);
            return;
        }

        // This should work... but it doesn't.
        /*let atkOutputAttr = findObjs({ type: 'attribute', characterid: object.id, name: "repeating_spell-"+spellAttacks[i].level+"_"+spellAttacks[i].id+"_spelloutput" })[0];
         atkOutputAttr = atkOutputAttr || createObj('attribute', { name: "repeating_spell-"+spellAttacks[i].level+"_"+spellAttacks[i].id+"_spelloutput", characterid: object.id});
         onSheetWorkerCompleted(function() {
         updateSpellAttackProf(character, ++i);
         });
         log('beyond: ' + "repeating_spell-"+spellAttacks[i].level+"_"+spellAttacks[i].id+"_spelloutput" + " = " + 'ATTACK');
         atkOutputAttr.setWithWorker({ current: 'ATTACK' });*/

        let atkIdAttr = findObjs({ type: 'attribute', characterid: object.id, name: 'repeating_spell-'+spellAttacks[i].level+'_'+spellAttacks[i].id+'_spellattackid' })[0];
        if(atkIdAttr != null) {
            let atkId = atkIdAttr.get('current');
            let atkProfAttr = findObjs({ type: 'attribute', characterid: object.id, name: 'repeating_attack_'+atkId+'_atkprofflag' })[0];
            atkProfAttr = atkProfAttr || createObj('attribute', { name: 'repeating_attack_'+atkId+'_atkprofflag', characterid: object.id });

            // async load next item
            onSheetWorkerCompleted(function() {
                updateSpellAttackProf(character, ++i);
            });
            log('beyond: ' + 'repeating_attack_'+atkId+'_atkprofflag' + " = " + '(@{pb})');
            atkProfAttr.setWithWorker({ current: '(@{pb})' });
        }
        else {
            reportReady(character);
        }
    }

    const importSpell = (character, spells, index, addAttack) => {
        let spell = spells[index];

        let matchingSpells = spells.filter((spellAttributes) => {
            return spellAttributes.definition.name == spell.definition.name;
        });

        let level = (spell.definition.level === 0) ? 'cantrip' : spell.definition.level.toString();
        let row = getRepeatingRowIds('spell-'+level, 'spellname', spell.definition.name, matchingSpells.findIndex(sA => sA.id == spell.id && sA.spellCastingAbility == spell.spellCastingAbility));

        spell.castingTime = {
            castingTimeInterval: spell.activation.activationTime,
        };
        if(spell.activation.activationType == 1) spell.castingTime.castingTimeUnit = 'Action';
        if(spell.activation.activationType == 3) spell.castingTime.castingTimeUnit = 'Bonus Action';
        if(spell.activation.activationType == 4) spell.castingTime.castingTimeUnit = 'Reaction';
        if(spell.activation.activationType == 5) spell.castingTime.castingTimeUnit = 'Second' + (spell.activation.activationTime != 1 ? 's' : '');
        if(spell.activation.activationType == 6) spell.castingTime.castingTimeUnit = 'Minute' + (spell.activation.activationTime != 1 ? 's' : '');
        if(spell.activation.activationType == 7) spell.castingTime.castingTimeUnit = 'Hour' + (spell.activation.activationTime != 1 ? 's' : '');
        if(spell.activation.activationType == 8) spell.castingTime.castingTimeUnit = 'Day' + (spell.activation.activationTime != 1 ? 's' : '');

        let attributes = {};
        attributes["repeating_spell-"+level+"_"+row+"_spellprepared"] = (spell.prepared || spell.alwaysPrepared) ? '1' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellname"] = spell.definition.name;
        attributes["repeating_spell-"+level+"_"+row+"_spelllevel"] = level;
        attributes["repeating_spell-"+level+"_"+row+"_spellschool"] = spell.definition.school.toLowerCase();
        attributes["repeating_spell-"+level+"_"+row+"_spellritual"] = (spell.ritual) ? '{{ritual=1}}' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellcastingtime"] = spell.castingTime.castingTimeInterval + ' ' + spell.castingTime.castingTimeUnit;
        attributes["repeating_spell-"+level+"_"+row+"_spellrange"] = (spell.definition.range.origin === 'Ranged') ? spell.definition.range.rangeValue + 'ft.' : spell.definition.range.origin;
        attributes["repeating_spell-"+level+"_"+row+"_options-flag"] = '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellritual"] = (spell.definition.ritual) ? '1' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellconcentration"] = (spell.definition.concentration) ? '{{concentration=1}}' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellduration"] = (spell.definition.duration.durationUnit !== null) ? spell.definition.duration.durationInterval + ' ' + spell.definition.duration.durationUnit : spell.definition.duration.durationType;
        attributes["repeating_spell-"+level+"_"+row+"_spell_ability"] = spell.spellCastingAbility == null ? '0*' : '@{'+_ABILITY[spell.spellCastingAbility]+'_mod}+';

        let descriptions = spell.definition.description.split('At Higher Levels. ');
        attributes["repeating_spell-"+level+"_"+row+"_spelldescription"] = replaceChars(descriptions[0]);
        attributes["repeating_spell-"+level+"_"+row+"_spellathigherlevels"] = (descriptions.length > 1) ? replaceChars(descriptions[1]) : '';

        let components = spell.definition.components;
        attributes["repeating_spell-"+level+"_"+row+"_spellcomp_v"] = (components.includes(1)) ? '{{v=1}}' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellcomp_s"] = (components.includes(2)) ? '{{s=1}}' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellcomp_m"] = (components.includes(3)) ? '{{m=1}}' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellcomp_materials"] = (components.includes(3)) ? replaceChars(spell.definition.componentsDescription) : '';

        let healing = getObjects(spell, 'subType', 'hit-points');
        if(healing.length !== 0) {
            healing = healing[0];
            if(healing.type == 'bonus') {
                let bonus = 0;
                if(getObjects(character.classes, 'name', 'Disciple of Life').length > 0) {
                    bonus += (2 + parseInt(spell.definition.level));
                }

                attributes["repeating_spell-"+level+"_"+row+"_spellattack"] = 'None';
                attributes["repeating_spell-"+level+"_"+row+"_spellsave"] = '';
                attributes["repeating_spell-"+level+"_"+row+"_spelldamage"] = '';
                attributes["repeating_spell-"+level+"_"+row+"_spelldamagetype"] = '';
                if(healing.die.diceString != null) {
                    attributes["repeating_spell-"+level+"_"+row+"_spellhealing"] = healing.die.diceString+'+'+(parseInt(healing.die.fixedValue == null ? 0 : healing.die.fixedValue)+bonus);
                }
                else if (healing.die.fixedValue != null) {
                    attributes["repeating_spell-"+level+"_"+row+"_spellhealing"] = (parseInt(healing.die.fixedValue)+bonus)+'d1';
                }
                attributes["repeating_spell-"+level+"_"+row+"_spelldmgmod"] = healing.usePrimaryStat ? 'Yes' : '0';

                bonus = 0;
                if(getObjects(character.classes, 'name', 'Disciple of Life').length > 0) {
                    bonus += 1;
                }

                let ahl = spell.definition.atHigherLevels.higherLevelDefinitions;
                for(let i in ahl) {
                    if(ahl[i].dice != null) {
                        if(ahl[i].dice.diceValue != null) {
                            attributes["repeating_spell-"+level+"_"+row+"_spellhldie"] = ahl[i].dice.diceCount;
                            attributes["repeating_spell-"+level+"_"+row+"_spellhldietype"] = 'd'+ahl[i].dice.diceValue;
                        }
                        else {
                            attributes["repeating_spell-"+level+"_"+row+"_spellhldie"] = '0';
                            attributes["repeating_spell-"+level+"_"+row+"_spellhldietype"] = 'd4';
                        }
                        attributes["repeating_spell-"+level+"_"+row+"_spellhlbonus"] = parseInt(ahl[i].dice.fixedValue)+bonus;
                    }
                }

                if(healing.hasOwnProperty('atHigherLevels') && healing.atHigherLevels.scaleType === 'spellscale') {
                    if(healing.die.diceValue != null) {
                        attributes["repeating_spell-"+level+"_"+row+"_spellhldie"] = healing.die.diceCount;
                        attributes["repeating_spell-"+level+"_"+row+"_spellhldietype"] = 'd'+healing.die.diceValue;
                    }
                    else {
                        attributes["repeating_spell-"+level+"_"+row+"_spellhldie"] = '0';
                        attributes["repeating_spell-"+level+"_"+row+"_spellhldietype"] = 'd4';
                    }
                    if(healing.die.fixedValue == null) healing.die.fixedValue = 0;
                    attributes["repeating_spell-"+level+"_"+row+"_spellhlbonus"] = parseInt(healing.die.fixedValue)+bonus;
                }

                if(addAttack)  {
                    attributes["repeating_spell-"+level+"_"+row+"_spelloutput"] = 'ATTACK';
                }
            }
        }

        // Damage/Attack
        let damages = getObjects(spell, 'type', 'damage');
        if(damages.length !== 0 && (spell.definition.attackType !== "" || spell.definition.saveDcStat !== null)) {
            let doDamage = false;
            damages.forEach((damage, i) => {
                if(damage.die.diceString != null){
                    let damageNumber = (i === 0) ? '' : 2;
                    attributes["repeating_spell-"+level+"_"+row+"_spelldamage"+damageNumber] = damage.die.diceString;
                    attributes["repeating_spell-"+level+"_"+row+"_spelldamagetype"+damageNumber] = damage.friendlySubtypeName;

                    if(!doDamage){
                        doDamage = true;

                        let attackType = ['None', 'Melee', 'Ranged'];
                        attributes["repeating_spell-"+level+"_"+row+"_spellattack"] = attackType[spell.definition.attackType == null ? 0 : spell.definition.attackType];
                        attributes["repeating_spell-"+level+"_"+row+"_spellsave"] = (spell.definition.saveDcAbilityId == null) ? '' : ucFirst(_ABILITY[_ABILITIES[spell.definition.saveDcAbilityId]]);

                        let hlDiceCount = '';
                        let hlDiceValue = '';

                        if(damage.hasOwnProperty('atHigherLevels')) {
                            let ahl = spell.definition.atHigherLevels.higherLevelDefinitions;
                            if(spell.definition.level == 0 && ahl.length == 0) {
                                if(spell.definition.atHigherLevels.scaleType == 'characterlevel') {
                                    attributes["repeating_spell-"+level+"_"+row+"_spell_damage_progression"] = 'Cantrip Dice';
                                }
                            }
                            else if(spell.definition.level > 0) {
                                for(let i in ahl) {
                                    if(ahl[i].dice == null) continue;
                                    attributes["repeating_spell-"+level+"_"+row+"_spellhldie"] = ahl[i].dice.diceCount;
                                    attributes["repeating_spell-"+level+"_"+row+"_spellhldietype"] = 'd'+ahl[i].dice.diceValue;
                                    hlDiceCount = ahl[i].dice.diceCount;
                                    hlDiceValue = ahl[i].dice.diceValue;
                                }

                                if(damage.atHigherLevels.scaleType === 'spellscale'){
                                    attributes["repeating_spell-"+level+"_"+row+"_spellhldie"] = '1';
                                    attributes["repeating_spell-"+level+"_"+row+"_spellhldietype"] = 'd'+damage.die.diceValue;
                                    hlDiceCount = '1';
                                    hlDiceValue = damage.die.diceValue;
                                }
                            }
                        }
                    }
                }
            });

            if(addAttack && doDamage) {
                // attributes["repeating_spell-"+level+"_"+row+"_spelloutput"] = 'SPELLCARD';
                attributes["repeating_spell-"+level+"_"+row+"_spelloutput"] = 'ATTACK';
                spellAttacks.push({level: level, id: row});
            }
        }

        if (spellTargetInAttacks) {
            let restrictions = calculateRestrictionsComment(damages.concat(healing));
            if(restrictions != null) {
                attributes["repeating_spell-"+level+"_"+row+"_spelltarget"] = replaceChars(restrictions);
                if(attributes["repeating_spell-"+level+"_"+row+"_spelloutput"] == 'ATTACK') {
                    attributes["repeating_spell-"+level+"_"+row+"_includedesc"] = 'partial';
                }
            }
        }
        return attributes;
    };

    const blankIfNull = (input) => {
        return (input === null)?"":input;
    }

    // calculates spell restriction comment from damage and hit-points modifiers, as follows:
    //
    // as type selection (different restrictions):
    // (friendlySubtypeName || friendlyTypeName) : restriction\n
    // (friendlySubtypeName || friendlyTypeName) : restriction\n
    // ...
    //
    // as general constraint (single modifier with a restriction):
    // restriction 
    //
    // as multiple choice (same restriction multiple modifiers):
    // restriction
    //
    // NOTE: this function is very defensive about inputs because some entries from beyond have
    // null values and others have empty strings
    const calculateRestrictionsComment = (modifiers) => {
        if (!modifiers) {
            return null;
        }
        if (modifiers.length < 1) {
            return null;
        }
        let restrictions = new Set();
        let first = blankIfNull(modifiers[0].restriction);
        let multiple = false;
        modifiers.forEach((modifier, i) => {
            let current = blankIfNull(modifier.restriction);
            if (current != first) {
                // even if some types have null restrictions and others have non-blank ones, this still counts as choices
                multiple = true;
            }
            if (current != '') {
                // record all unique combinations
                restrictions.add((modifier.friendlySubtypeName || modifier.friendlyTypeName) + ": " + current);
            }
        });
        let lines = [...restrictions];
        if (multiple && (lines.length > 0)) {
            // NOTE: it is possible to have only one line here because the other choices are blank or null
            return lines.join('\n');
        }
        if (first == '') {
            // convert back to null if all we had was a blank (or null) restriction
            return null;
        }
        return first;
    }   

    const ucFirst = (string) => {
        if(string == null) return string;
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    const sendConfigMenu = (player, first) => {
        let playerid = player.id;
        let prefix = (state[state_name][playerid].config.prefix !== '') ? state[state_name][playerid].config.prefix : '[NONE]';
        let prefixButton = makeButton(prefix, '!beyond --config prefix|?{Prefix}', buttonStyle);
        let suffix = (state[state_name][playerid].config.suffix !== '') ? state[state_name][playerid].config.suffix : '[NONE]';
        let suffixButton = makeButton(suffix, '!beyond --config suffix|?{Suffix}', buttonStyle);
        let overwriteButton = makeButton(state[state_name][playerid].config.overwrite, '!beyond --config overwrite|'+!state[state_name][playerid].config.overwrite, buttonStyle);
        let debugButton = makeButton(state[state_name][playerid].config.debug, '!beyond --config debug|'+!state[state_name][playerid].config.debug, buttonStyle);
        // let silentSpellsButton = makeButton(state[state_name][playerid].config.silentSpells, '!beyond --config silentSpells|'+!state[state_name][playerid].config.silentSpells, buttonStyle);

        let listItems = [
            '<span style="float: left; margin-top: 6px;">Overwrite:</span> '+overwriteButton+'<br /><small style="clear: both; display: inherit;">This option will overwrite an existing character sheet with a matching character name. I recommend making a backup copy just in case.</small>',
            '<span style="float: left; margin-top: 6px;">Prefix:</span> '+prefixButton,
            '<span style="float: left; margin-top: 6px;">Suffix:</span> '+suffixButton,
            '<span style="float: left; margin-top: 6px;">Debug:</span> '+debugButton,
            // '<span style="float: left; margin-top: 6px;">Silent Spells:</span> '+silentSpellsButton
        ]

        let list = '<b>Importer</b>'+makeList(listItems, 'overflow: hidden; list-style: none; padding: 0; margin: 0;', 'overflow: hidden; margin-top: 5px;');

        let languageGroupingButton = makeButton(state[state_name][playerid].config.languageGrouping, '!beyond --config languageGrouping|'+!state[state_name][playerid].config.languageGrouping, buttonStyle);
        let initTieBreakerButton = makeButton(state[state_name][playerid].config.initTieBreaker, '!beyond --config initTieBreaker|'+!state[state_name][playerid].config.initTieBreaker, buttonStyle);
        let spellTargetInAttacksButton = makeButton(state[state_name][playerid].config.spellTargetInAttacks, '!beyond --config spellTargetInAttacks|'+!state[state_name][playerid].config.spellTargetInAttacks, buttonStyle);

        let inPlayerJournalsButton = makeButton(player.get('displayname'), '', buttonStyle);
        let controlledByButton = makeButton(player.get('displayname'), '', buttonStyle);
        if(playerIsGM(playerid)) {
            let players = '';
            let playerObjects = findObjs({
                _type: "player",
            });
            for(let i = 0; i < playerObjects.length; i++) {
                players += '|'+playerObjects[i]['attributes']['_displayname']+','+playerObjects[i].id;
            }

            let ipj = state[state_name][playerid].config.inplayerjournals == '' ? '[NONE]' : state[state_name][playerid].config.inplayerjournals;
            if(ipj != '[NONE]' && ipj != 'all') ipj = getObj('player', ipj).get('displayname');
            inPlayerJournalsButton = makeButton(ipj, '!beyond --config inplayerjournals|?{Player|None,[NONE]|All Players,all'+players+'}', buttonStyle);
            let cb = state[state_name][playerid].config.controlledby == '' ? '[NONE]' : state[state_name][playerid].config.controlledby;
            if(cb != '[NONE]' && cb != 'all') cb = getObj('player', cb).get('displayname');
            controlledByButton = makeButton(cb, '!beyond --config controlledby|?{Player|None,[NONE]|All Players,all'+players+'}', buttonStyle);
        }

        let sheetListItems = [
            '<span style="float: left; margin-top: 6px;">In Player Journal:</span> '+inPlayerJournalsButton,
            '<span style="float: left; margin-top: 6px;">Player Control Permission:</span> '+controlledByButton,
            '<span style="float: left; margin-top: 6px;">Language Grouping:</span> '+languageGroupingButton,
            '<span style="float: left; margin-top: 6px;">Initiative Tie Breaker:</span> '+initTieBreakerButton,
            '<span style="float: left; margin-top: 6px;">Spell Info in Attacks:</span> '+spellTargetInAttacksButton
        ]

        let sheetList = '<hr><b>Character Sheet</b>'+makeList(sheetListItems, 'overflow: hidden; list-style: none; padding: 0; margin: 0;', 'overflow: hidden; margin-top: 5px;');

        let debug = '';
        if(state[state_name][playerid].config.debug){
            let debugListItems = [];
            for(let importItemName in state[state_name][playerid].config.imports){
                let button = makeButton(state[state_name][playerid].config.imports[importItemName], '!beyond --imports '+importItemName+'|'+!state[state_name][playerid].config.imports[importItemName], buttonStyle);
                debugListItems.push('<span style="float: left">'+importItemName+':</span> '+button)
            }

            debug += '<hr><b>Imports</b>'+makeList(debugListItems, 'overflow: hidden; list-style: none; padding: 0; margin: 0;', 'overflow: hidden; margin-top: 5px;');
        }

        let resetButton = makeButton('Reset', '!beyond --reset', buttonStyle + ' margin: auto; width: 90%; display: block; float: none;');

        let title_text = (first) ? script_name + ' First Time Setup' : script_name + ' Config';
        let text = '<div style="'+style+'">'+makeTitle(title_text)+list+sheetList+debug+'<hr>'+resetButton+'</div>';

        sendChat(script_name, '/w "' + player.get('displayname') + '" ' + text, null, {noarchive:true});
    };

    const sendHelpMenu = (player, first) => {
        // let configButton = makeButton('Config', '!beyond --config', buttonStyle+' margin: auto; width: 90%; display: block; float: none;');

        let listItems = [
            '<span style="text-decoration: underline; font-size: 90%;">!beyond --help</span><br />Shows this menu.',
            '<span style="text-decoration: underline; font-size: 90%;">!beyond --config</span><br />Shows the configuration menu. (GM only)',
            '<span style="text-decoration: underline; font-size: 90%;">!beyond --import [CHARACTER JSON]</span><br />Imports a character from <a href="http://www.dndbeyond.com" target="_blank">D&D Beyond</a>.',
        ];

        let command_list = makeList(listItems, 'list-style: none; padding: 0; margin: 0;');

        let text = '<div style="'+style+'">';
        text += makeTitle(script_name + ' Help');
        text += '<p>Go to a character on <a href="http://www.dndbeyond.com" target="_blank">D&D Beyond</a>, and put `/json` behind the link. Copy the full contents of this page and paste it behind the command `!beyond --import`.</p>';
        text += '<p>For more information take a look at my <a style="text-decoration: underline" href="https://github.com/sillvva/Roll20-API-Scripts/blob/master/5eOGL-DND-Beyond-Importer/BeyondImporter.js" target="_blank">Github</a> repository.</p>';
        text += '<hr>';
        text += '<b>Commands:</b>'+command_list;
        // text += '<hr>';
        // text += configButton;
        text += '</div>';

        sendChat(script_name, '/w "'+ player.get('displayname') + '" ' + text, null, {noarchive:true});
    };

    const makeTitle = (title) => {
        return '<h3 style="margin-bottom: 10px;">'+title+'</h3>';
    };

    const makeButton = (title, href, style) => {
        return '<a style="'+style+'" href="'+href+'">'+title+'</a>';
    };

    const makeList = (items, listStyle, itemStyle) => {
        let list = '<ul style="'+listStyle+'">';
        items.forEach((item) => {
            list += '<li style="'+itemStyle+'">'+item+'</li>';
        });
        list += '</ul>';
        return list;
    };

    const replaceChars = (text) => {
        text = text.replace('\&rsquo\;', '\'').replace('\&mdash\;','—').replace('\ \;',' ').replace('\&hellip\;','…');
        text = text.replace('\&nbsp\;', ' ');
        text = text.replace('\û\;','û').replace('’', '\'').replace(' ', ' ');
        text = text.replace(/<li[^>]+>/gi,'• ').replace(/<\/li>/gi,'');
        text = text.replace(/\r\n(\r\n)+/gm,'\r\n');
        return text;
    };

    const getRepeatingRowIds = (section, attribute, matchValue, index) => {
        let ids = [];
        if(state[state_name][beyond_caller.id].config.overwrite) {
            let matches = findObjs({ type: 'attribute', characterid: object.id })
                .filter((attr) => {
                    return attr.get('name').indexOf('repeating_'+section) !== -1 && attr.get('name').indexOf(attribute) !== -1 && attr.get('current') == matchValue;
                });
            for(let i in matches) {
                let row = matches[i].get('name').replace('repeating_'+section+'_','').replace('_'+attribute,'');
                ids.push(row);
            }
            if(ids.length == 0) ids.push(generateRowID());
        }
        else ids.push(generateRowID());

        if(index == null) return ids;
        else return ids[index] == null && index >= 0 ? generateRowID() : ids[index];
    }

    const createRepeatingTrait = (object, trait, options) => {
        options = options || {};

        let opts = {
            index: 0,
            itemid: ''
        };
        Object.assign(opts, options);

        let row = getRepeatingRowIds('traits', 'name', trait.name, opts.index);

        let attributes = {}
        attributes["repeating_traits_"+row+"_name"] = trait.name;
        attributes["repeating_traits_"+row+"_source"] = trait.source;
        attributes["repeating_traits_"+row+"_source_type"] = trait.source_type;
        attributes["repeating_traits_"+row+"_description"] = replaceChars(trait.description);
        attributes["repeating_traits_"+row+"_options-flag"] = '0';

        return attributes;
    };

    const createRepeatingAttack = (object, attack, options) => {
        options = options || {};

        let opts = {
            index: 0,
            itemid: ''
        };
        Object.assign(opts, options);

        let attackrow = getRepeatingRowIds('attack', 'atkname', attack.name, opts.index);

        let attackattributes = {};
        attackattributes["repeating_attack_"+attackrow+"_options-flag"] = '0';
        attackattributes["repeating_attack_"+attackrow+"_atkname"] = attack.name;
        attackattributes["repeating_attack_"+attackrow+"_itemid"] = opts.itemid;
        attackattributes["repeating_attack_"+attackrow+"_atkflag"] = '{{attack=1}}';
        attackattributes["repeating_attack_"+attackrow+"_atkattr_base"] = '@{'+attack.attack.attribute+'_mod}';
        attackattributes["repeating_attack_"+attackrow+"_atkprofflag"] = '(@{pb})';
        attackattributes["repeating_attack_"+attackrow+"_atkmagic"] = attack.magic;
        attackattributes["repeating_attack_"+attackrow+"_atkrange"] = attack.range;
        attackattributes["repeating_attack_"+attackrow+"_atkmod"] = attack.attack.mod == null ? '' : attack.attack.mod;
        attackattributes["repeating_attack_"+attackrow+"_atkcritrange"] = attack.critrange == null ? '' : attack.critrange;

        attackattributes["repeating_attack_"+attackrow+"_dmgflag"] = '{{damage=1}} {{dmg1flag=1}}';
        attackattributes["repeating_attack_"+attackrow+"_dmgbase"] = typeof attack.damage.diceString == 'string' ? attack.damage.diceString+'' : '';
        attackattributes["repeating_attack_"+attackrow+"_dmgattr"] = (attack.damage.attribute === '0') ? '0' : '@{'+attack.damage.attribute+'_mod}';
        attackattributes["repeating_attack_"+attackrow+"_dmgtype"] = attack.damage.type;
        attackattributes["repeating_attack_"+attackrow+"_dmgcustcrit"] = attack.damage.diceString;
        attackattributes["repeating_attack_"+attackrow+"_dmgmod"] = attack.damage.mod == null ? '' : attack.damage.mod;

        if(attack.damage2 != null) {
            attackattributes["repeating_attack_"+attackrow+"_dmg2flag"] = '{{damage=1}} {{dmg2flag=1}}';
            attackattributes["repeating_attack_"+attackrow+"_dmg2base"] = attack.damage2.diceString;
            attackattributes["repeating_attack_"+attackrow+"_dmg2attr"] = (attack.damage2.attribute === '0') ? '0' : '@{'+attack.damage2.attribute+'_mod}';
            attackattributes["repeating_attack_"+attackrow+"_dmg2type"] = attack.damage2.type;
            attackattributes["repeating_attack_"+attackrow+"_dmg2custcrit"] = attack.damage2.diceString;
        }

        attackattributes["repeating_attack_"+attackrow+"_atk_desc"] = '';//replaceChars(attack.description);

        return attackattributes;
    };

    const getTotalAbilityScore = (character, scoreId) => {
        let index = scoreId-1;
        let base = (character.stats[index].value == null ? 10 : character.stats[index].value),
            bonus = (character.bonusStats[index].value == null ? 0 : character.bonusStats[index].value),
            override = (character.overrideStats[index].value == null ? 0 : character.overrideStats[index].value),
            total = base + bonus,
            modifiers = getObjects(character, '', _ABILITY[_ABILITIES[scoreId]] + "-score");
        if(override > 0) total = override;
        if(modifiers.length > 0) {
            let used_ids = [];
            for(let i = 0; i < modifiers.length; i++){
                if(modifiers[i].type == 'bonus' && used_ids.indexOf(modifiers[i].id) == -1) {
                    total += modifiers[i].value;
                    used_ids.push(modifiers[i].id);
                }
            }
        }

        return total;
    };

    //return an array of objects according to key, value, or key and value matching, optionally ignoring objects in array of names
    const getObjects = (obj, key, val, except) => {
        except = except || [];
        let objects = [];
        for (let i in obj) {
            if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] == 'object') {
                if (except.indexOf(i) != -1) {
                    continue;
                }
                objects = objects.concat(getObjects(obj[i], key, val));
            } else
            //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
            if (i == key && obj[i] == val || i == key && val == '') { //
                objects.push(obj);
            } else if (obj[i] == val && key == ''){
                //only add if the object is not already in the array
                if (objects.lastIndexOf(obj) == -1){
                    objects.push(obj);
                }
            }
        }
        return objects;
    };

    // Find an existing repeatable item with the same name, or generate new row ID
    const getOrMakeRowID = (character,repeatPrefix,name) => {
        // Get list of all of the character's attributes
        let attrObjs = findObjs({ _type: "attribute", _characterid: character.get("_id") });

        let i = 0;
        while (i < attrObjs.length)
        {
            // If this is a feat taken multiple times, strip the number of times it was taken from the name
            /*let attrName = attrObjs[i].get("current").toString();
             if (regexIndexOf(attrName, / x[0-9]+$/) !== -1)
             attrName = attrName.replace(/ x[0-9]+/,"");

             if (attrObjs[i].get("name").indexOf(repeatPrefix) !== -1 && attrObjs[i].get("name").indexOf("_name") !== -1 && attrName === name)
             return attrObjs[i].get("name").substring(repeatPrefix.length,(attrObjs[i].get("name").indexOf("_name")));
             i++;*/
            i++;
        }
        return generateRowID();
    };

    const generateUUID = (function() {
        let a = 0, b = [];
        return function() {
            let c = (new Date()).getTime() + 0, d = c === a;
            a = c;
            for (var e = new Array(8), f = 7; 0 <= f; f--) {
                e[f] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c % 64);
                c = Math.floor(c / 64);
            }
            c = e.join("");
            if (d) {
                for (f = 11; 0 <= f && 63 === b[f]; f--) {
                    b[f] = 0;
                }
                b[f]++;
            } else {
                for (f = 0; 12 > f; f++) {
                    b[f] = Math.floor(64 * Math.random());
                }
            }
            for (f = 0; 12 > f; f++){
                c += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);
            }
            return c;
        };
    }());

    const generateRowID = function() {
        "use strict";
        return generateUUID().replace(/_/g, "Z");
    };

    const regexIndexOf = (str, regex, startpos) => {
        let indexOf = str.substring(startpos || 0).search(regex);
        return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
    };

    const pre_log = (message) => {
        log('---------------------------------------------------------------------------------------------');
        log(message);
        log('---------------------------------------------------------------------------------------------');
    };

    const checkInstall = function() {
        if(!_.has(state, state_name)){
            state[state_name] = state[state_name] || {};
        }
        setDefaults();
    };

    const setDefaults = (reset) => {
        const defaults = {
            overwrite: false,
            debug: false,
            prefix: '',
            suffix: '',
            inplayerjournals: '',
            controlledby: '',
            languageGrouping: false,
            initTieBreaker: false,
            spellTargetInAttacks: true,
            imports: {
                classes: true,
                class_spells: true,
                class_traits: true,
                inventory: true,
                proficiencies: true,
                traits: true,
                languages: true,
                bonuses: true,
                notes: true,
            }
        };

        let playerObjects = findObjs({
            _type: "player",
        });
        playerObjects.forEach((player) => {
            if(!state[state_name][player.id]) {
                state[state_name][player.id] = {};
            }

            if(!state[state_name][player.id].config) {
                state[state_name][player.id].config = defaults;
            }

            for(let item in defaults) {
                if(!state[state_name][player.id].config.hasOwnProperty(item)) {
                    state[state_name][player.id].config[item] = defaults[item];
                }
            }

            for(let item in defaults.imports) {
                if(!state[state_name][player.id].config.imports.hasOwnProperty(item)) {
                    state[state_name][player.id].config.imports[item] = defaults.imports[item];
                }
            }

            if(!state[state_name][player.id].config.hasOwnProperty('firsttime')){
                if(!reset){
                    sendConfigMenu(player, true);
                }
                state[state_name][player.id].config.firsttime = false;
            }
        });
    };

    const importClassOptions = (repeating_attributes, trait, current_class, class_options, repeat_index) => {
        if(trait.requiredLevel > current_class.level) {
            // not applied to this character, trait is available at higher levels
            return repeat_index;
        }

        // search for selected options for the given trait
        let selections = getObjects(class_options, 'componentId', trait.id);
        if (selections.length < 1) {
            // no selections, ignore trait
            return repeat_index;
        }

        let index = repeat_index;
        for (selection of selections) {
            let text = replaceChars(`${selection.definition.description}`);
            let trait_docs = {
                name: selection.definition.name,
                description: text,
                source: 'Class',
                source_type: current_class.definition.name
            }        
            Object.assign(repeating_attributes, createRepeatingTrait(object, trait_docs, index++));
        }
        return index;
    };
})();
