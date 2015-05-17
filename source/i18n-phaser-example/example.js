var game = new Phaser.Game(800, 600, Phaser.AUTO, 'gameContainer', { preload: preload, create: create });

// we would ideally load this from a cookie or a setting
var currentLocale = 'en';

// keep track of what we're currently saying
var currentLine;

var captionStyle = {
  "align": "center",
  "fill": "#ff0044",
  "font": "35px Arial",
  "strokeThickness": 4
};

// load our assets before starting
function preload() {
  game.load.image('button', 'assets/play.png');
  loadLocale(currentLocale);
}

// given a locale, load the audio and captions for it
function loadLocale(locale) {
  var localeFolder = 'assets/audio/' + locale + '/';

  game.load.audiosprite('speech', [
    localeFolder + 'speech.ac3',
    localeFolder + 'speech.m4a',
    localeFolder + 'speech.mp3',
    localeFolder + 'speech.ogg',
  ], localeFolder + 'speech.json');

  // load the atlas once more so we can easily re-use the timings for captions
  //
  // TODO: consider using a two-state preloader to avoid loading this json twice.
  //       see http://www.html5gamedevs.com/topic/5774-how-can-i-load-json-and-then-use-it/
  //       as a bonus we could then just use the speechTimings.resources rather
  //       than specify each extension above
  game.load.json('speechTimings', localeFolder + 'speech.json');

  game.load.json('speechCaptions', localeFolder + 'captions.json');
}

// actually kick off the "game"
function create() {
  game.stage.backgroundColor = '#0B5096';

  // add some buttons for playing various lines.
  // In a real game these would be triggered by player actions.
  game.add.button(game.world.centerX - 50, 200, 'button', function(){ say("locked_door") });
  game.add.button(game.world.centerX - 50, 300, 'button', function(){ say("found_key") });
  game.add.button(game.world.centerX - 50, 400, 'button', function(){ say("entered_room") });

  // make it easy to access our speech object now that we're sure it is preloaded
  game.speech = new Phaser.AudioSprite(game, 'speech');
}

function say(translationKey) {
  // don't talk over ourselves
  clearCurrentLine();

  // get the text from our captions json
  var textToRender = game.cache.getJSON('speechCaptions')[translationKey];

  // draw our caption
  var caption = game.add.text(0, 20, textToRender, captionStyle);
  caption.x = game.world.centerX - caption.width / 2;

  // start the audio
  var audio = game.speech.play(translationKey);

  // set a timeout to remove the caption when the audio finishes
  var timeoutId = setTimeout(function(){
    caption.destroy();
  }, audio.durationMS);

  // save our line info so we can cancel it if needed
  currentLine = {
    "audio": audio,
    "caption": caption,
    "timeoutId": timeoutId
  };
}

function clearCurrentLine() {
  if (currentLine) {
    clearTimeout(currentLine.timeoutId);
    currentLine.caption.destroy();
    currentLine.audio.stop();
  }
}
