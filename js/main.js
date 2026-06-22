// ══════════════════════════════════════════
//  Digital Exhibition Faith — module manifest
// ══════════════════════════════════════════
// Loads the core runtime, then every exhibition module (each self-registers via
// core.registerExhibit), then starts the render loop. To ADD a new exhibition:
// create js/exhibits/<name>.js and add one import line below — nothing else here
// or in core.js needs to change.
import { start } from './core.js';

import './exhibits/alim-photographer.js';
import './exhibits/masjid-uncles.js';
import './exhibits/vinyl-crate.js';
import './exhibits/crt-tv.js';

start();
