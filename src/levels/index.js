// index.js — the ordered campaign. Chapter I -> VII. The story ends; mastery does not.
import * as ch1 from './ch1.js';
import * as ch2 from './ch2.js';
import * as ch3 from './ch3.js';
import * as ch4 from './ch4.js';
import * as ch5 from './ch5.js';
import * as ch6 from './ch6.js';
import * as ch7 from './ch7.js';

export const CHAPTERS = [
  { id:'ch1', roman:'I',   title:ch1.title, build:ch1.build },
  { id:'ch2', roman:'II',  title:ch2.title, build:ch2.build },
  { id:'ch3', roman:'III', title:ch3.title, build:ch3.build },
  { id:'ch4', roman:'IV',  title:ch4.title, build:ch4.build },
  { id:'ch5', roman:'V',   title:ch5.title, build:ch5.build },
  { id:'ch6', roman:'VI',  title:ch6.title, build:ch6.build },
  { id:'ch7', roman:'VII', title:ch7.title, build:ch7.build },
];
