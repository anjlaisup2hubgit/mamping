# Hometown Map

## Download
Copy the project to your computer with `git clone https://github.com/anjlaisup2hubgit/mapping.git`.

## Features
- You walk up to a building and film it with your phone.
- The app notes where you stood, so it knows which building you filmed.
- A smart helper looks at the video and writes down the building's name and height.
- You check what it wrote and fix any mistakes.
- You can keep your video private or send it to the map.
- The map shows every building, and you can tap one to see its videos.
- A search box helps you find a place.
- You can switch the map between a street picture and a satellite picture.
- The app can spot buildings that are missing from the map and let you add them.
- A list shows the buildings close to you.

## File tree
```
mapping/
├── index.html      The page that holds the whole app.
├── sw.js           Lets the app open even with no internet.
├── CLAUDE.md       The rules for keeping the project tidy.
├── src/
│   ├── main.js     Starts the app.
│   ├── styles.css  Colors and shapes of everything you see.
│   ├── pages/      One file for each screen.
│   │   ├── home.js      Your videos.
│   │   ├── camera.js    Filming a building.
│   │   ├── saved.js     "Your video is saved" screen.
│   │   ├── scan.js      The helper studies your video.
│   │   ├── review.js    Check and fix the building facts.
│   │   ├── map.js       The big map.
│   │   ├── nearby.js    Buildings close to you.
│   │   ├── settings.js  Choices you can change.
│   │   └── help.js      How to use the app.
│   ├── components/ Small pieces that many screens share.
│   │   ├── bottomNav.js, header.js    Buttons at the bottom and top.
│   │   ├── mapView.js, miniMap.js     The big map and the small map.
│   │   ├── buildingLayer.js           Draws buildings on the map.
│   │   ├── buildingSheet.js, layersSheet.js, suggestSheet.js, sheet.js
│   │   │                              Panels that slide up from the bottom.
│   │   ├── searchBar.js               The place search box.
│   │   ├── osmAccount.js, osmConfirm.js   Log in and confirm sharing to OpenStreetMap.
│   │   ├── videoRow.js, toast.js      One video in a list, and little messages.
│   │   └── router.js, dom.js, icons.js    Moving between screens and drawing helpers.
│   └── data/       Saving, loading and talking to the internet.
│       ├── recorder.js, frames.js, upload.js   Filming, picking pictures, sending the video.
│       ├── location.js, geo.js, matching.js    Where you are and which building it is.
│       ├── buildings.js, overpass.js, satellite.js, search.js   Getting building and map facts.
│       ├── osmAuth.js, osmEdit.js              Logging in and editing OpenStreetMap.
│       ├── contributions.js, api.js, store.js, state.js, settings.js, config.js
│       │                                       Remembering things and talking to our server.
├── api/            The small server that helps us.
│   ├── analyze.js, outline.js        The smart helper that reads videos and finds buildings.
│   ├── contribute.js, contributions.js   Saves and lists what people send.
│   ├── upload-token.js               Lets a video be uploaded safely.
│   └── _claude.js                    Shared code for talking to the smart helper.
└── design/         Pictures of how each screen should look.
```
