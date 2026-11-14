# Mamping

## Main focus (read this first, next AI agent)
The whole point of this website is to **add 3D building details to OpenStreetMap** (OSM, the free world map anyone can edit).
"3D details" means the facts a 3D map needs to draw a building's shape: its outline, `height`, `building:levels` (number of floors), roof shape and colors.
Every new feature should help people get those facts into OSM faster, more correctly, or more easily — if it doesn't, it probably doesn't belong here.

## Download
For development `git clone https://github.com/anjlaisup2hubgit/mapping.git`.

## Features
- You walk up to a building and film it with your phone.
- The app notes where you stood, so it knows which building you filmed.
- Ai looks at the video and writes down the building's name and height.
- You check what it wrote and fix any mistakes.
- You can keep your video private or send it to the map.
- The map shows every building, and you can tap one to see its videos.
- A search box helps you find a place.
- You can switch the map between a street picture and a satellite picture.
- Before scanning, you drag a blue box over the area you want, and it tells you how many satellite pictures the AI will read, so a slow or limited AI can scan just a small spot.
- The find-missing button first shows ready-made outlines that Microsoft's and Google's AI already found (from Overture Maps, instant and free) for buildings OpenStreetMap does not have yet. If there are none, our AI reads satellite pictures of the map you see instead. Either way, you tick the ones you checked and add them.
- A list shows the buildings close to you.
- Typing the floors fills in the height (and the other way round), and you can add roof shape, roof height and colours.
- A small 3D drawing, with a person for scale, shows the building before you send it.
- A map switch shows in blue the buildings that still have no height, so you know what to film next.
- You get a warning before adding a building that overlaps one already on the map.
- When the AI gets a roof wrong, you can drag corners, add or remove corners, move the whole shape, turn it into a neat rectangle, undo, or remove a box that is not a building. Fixes are saved as you go.
- When the AI misses a roof, you can draw it yourself by tapping its corners on the satellite picture.
- With no internet, edits wait on your phone and are sent once you are back online.
- The Home tab lists your OpenStreetMap edits with links, counts what you added this week, and lets you undo your newest edit.

## File tree
```
mapping/
├── index.html      The page that holds the whole app.
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
│   │   ├── settings.js  Choices you can change.
│   │   └── help.js      How to use the app.
│   ├── components/ Small pieces that many screens share.
│   │   ├── bottomNav.js, header.js    Buttons at the bottom and top.
│   │   ├── mapView.js, miniMap.js     The big map and the small map.
│   │   ├── buildingLayer.js           Draws buildings on the map.
│   │   ├── buildingSheet.js, layersSheet.js, suggestSheet.js, batchSheet.js, sheet.js
│   │   │                              Panels that slide up from the bottom.
│   │   ├── searchBar.js               The place search box.
│   │   ├── osmAccount.js, osmConfirm.js   Log in and confirm sharing to OpenStreetMap.
│   │   ├── detailsFields.js, preview3d.js Height, floors, roof and colour boxes, and the 3D drawing.
│   │   ├── homeTab.js, editHistory.js     Home tab: your videos, your edits, undo.
│   │   ├── areaPicker.js                  The blue box for choosing which area to scan.
│   │   ├── missingLayer.js, cornerEditor.js, drawBuilding.js
│   │   │                                  Orange missing-building boxes, fixing their shape, drawing your own.
│   │   ├── videoRow.js, toast.js      One video in a list, and little messages.
│   │   └── router.js, dom.js, icons.js    Moving between screens and drawing helpers.
│   └── data/       Saving, loading and talking to the internet.
│       ├── recorder.js, frames.js, upload.js   Filming, picking pictures, sending the video.
│       ├── location.js, geo.js, matching.js    Where you are and which building it is.
│       ├── buildings.js, overpass.js, satellite.js, search.js   Getting building and map facts.
│       ├── readyBuildings.js                   Asks our server for ready-made outlines in the visible map.
│       ├── osmAuth.js, osmEdit.js              Logging in and editing OpenStreetMap.
│       ├── osmSend.js, history.js, osmUndo.js  Sending or queueing edits, remembering them, undoing them.
│       ├── contributions.js, api.js, store.js, state.js, settings.js, config.js
│       │                                       Remembering things and talking to our server.
├── api/            The small server that helps us.
│   ├── analyze.js, outline.js        The smart helper that reads videos and finds buildings.
│   ├── ready.js, _pmtiles.js, _vectorTile.js
│   │                                 Ready-made outlines: reads one small piece of Overture's huge building file.
│   ├── contribute.js, contributions.js   Saves and lists what people send.
│   ├── upload-token.js               Lets a video be uploaded safely.
│   └── _claude.js                    Shared code for talking to the smart helper.
└── design/         Pictures of how each screen should look.
```
