// =====================================================================
//  config.js: EVERYTHING that is specific to this surprise lives here.
//  Edit text, photo paths, theme colors and switches. Do NOT edit
//  script.js or style.css for normal changes.
//
//  Rules for editing:
//   - Keep every key and every text value inside "double quotes".
//   - No comma after the last item in a list or block.
//   - A line that starts with // is a comment and is safe to add or delete.
//   - To switch a screen off, set its flag under "modules" to false.
// =====================================================================
window.SITE_CONFIG = {

  "schemaVersion": 1,
  "slug": "our-special-surprise",
  "occasion": "birthday",
  "package": "premium",
  "pageTitle": "A Little Surprise for You",

  // Who it is for and who it is from. "nickname" (if set) is used on the envelope.
  "recipient": { "name": "ABC", "nickname": "Ab", "age": 28 },
  "sender": { "name": "ABCD" },

  // PRIVACY (new, optional). true = the opening envelope screen does NOT show the
  // recipient's name; it shows "pageTitle" instead. The name first appears on the
  // letter, after the passcode. Set to false to show welcome.headline as written.
  // Note: this only hides the name from the screen. Anyone who views the page
  // source can still read it, because everything runs in the visitor's browser.
  "privacy": { "hideNameUntilUnlock": true },

  // THEME: midnight, burgundy, plum, rose-gold and champagne. Change a hex color to restyle.
  "theme": {
    "preset": "midnight-rose-gold",
    "resolved": {
      "preset": "midnight-rose-gold",
      "colors": {
        "bg": "#12060b",
        "surface": "#231019",
        "text": "#f6e9dc",
        "muted": "#cdb0a6",
        "accent": "#e3b08f",
        "accent2": "#8c2a45",
        "line": "#4b2533",
        "onAccent": "#2a0f18"
      },
      "fonts": {
        "heading": "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif",
        "body": "'Segoe UI', system-ui, -apple-system, Roboto, sans-serif",
        "script": "'Segoe Script', 'Brush Script MT', cursive"
      },
      // decor is now drawn by the ambient background (dust, stars, petals, a few hearts).
      "decor": "petals",
      // motion: "gentle", "playful" or "minimal"
      "motion": "gentle",
      "confetti": ["#e3b08f", "#f6e3bf", "#c44662", "#fff1d0"]
    }
  },

  // SCREEN ORDER is fixed: welcome, passcode, letter, cake, gallery, timeline, countdown, final.
  // Set a flag to false to remove that screen.
  "modules": {
    "welcome": true,
    "passcode": true,
    "letter": true,
    "cake": true,
    "gallery": true,
    "timeline": false,
    "countdown": false,
    "final": true
  },

  "welcome": {
    "headline": "Happy Birthday, Ab",
    "subline": "",
    "buttonLabel": "Open"
  },

  // PLAYFUL gate only. The answer is readable by anyone who views the page source.
  // Never put private information behind it. Set "passcode" to false under modules to skip it.
  "passcode": {
    "prompt": "When is our meeting?",
    "hint": "",
    "answers": ["1st october", "1st oct", "october 1", "01 october"],
    "caseSensitive": false
  },

  "letter": {
    "title": "Dear ABC,",
    "paragraphs": [
      "Another year, and you still turn ordinary afternoons into little celebrations.",
      "I wanted to give you something you could open slowly, the way you open the things you love.",
      "Thank you for the long walks, the off-key singing in the car, and for laughing at my jokes even when they were not funny. Especially then."
    ],
    "signoff": "With all my love,",
    "signature": "ABCD"
  },

  // CAKE: candles from 1 to 12.
  "cake": {
    "candles": 12,
    "wishPrompt": "Make a wish, then blow out the candles",
    "blowLabel": "Blow out the candles",
    "cutLabel": "Cut the cake",
    "afterCutMessage": ""
  },

  // GALLERY: put image files in the photos folder, then list them here.
  // "file" is the path from index.html. "caption" appears under the photo.
  // Optional "alt" describes the picture for screen readers.
  
  "gallery": {
    "title": "Our little museum",
    "photos": [
      { "file": "photos/photo1.jpg", "caption": "" },
      { "file": "photos/photo2.jpg", "caption": "" },
      { "file": "photos/photo3.jpg", "caption": "" }
      { "file": "photos/photo4.jpg", "caption": "" }
    ]
  },
  // FINAL MESSAGE. Optional "revealLabel" and "revealText" add a button that shows an
  // extra message. They are not set here, so there is no extra button; add them
  // yourself only with your own words. Leaving "revealText" out is fully supported.
  "final": {
    "headline": "Happy Birthday",
    "message": "Happy Birthday to the person who holds a special place in my heart."
  },

  // AUDIO (new, optional). Leave "file" empty for no sound. If you add your own
  // royalty-free or personally owned audio file (for example "audio/song.mp3"), a visible
  // sound button appears. Nothing ever plays until the visitor presses it.
  "audio": { "file": "" }
};
