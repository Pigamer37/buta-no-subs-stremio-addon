# [Buta no subs Stremio addon](https://eb33844c60da-jp-subs-stremio-addon.baby-beamup.club/manifest.json)
 Node.js & Express based addon trying to provide Japanese subtitles to Stremio. (I'm new to backend so I'm using it as a learning experience).

## Normal program flow:
Whenever you start watching something on Stremio that matches some parameters set in the manifest (generated on `index.js`), the platform will call this addon. When the program can get the data for the item you are watching, it will appear in the subtitles menu under the japanese language, and each of the subtitle files will be labeled with a number so you can select which one to use. When it can't get the data, the entry wont be available.

## Run locally:
> [!IMPORTANT]
> 0. Previous steps/requirements:
>  - This project runs on Node.js, so install both Node.js and the npm package manager
>  - You'll need to get all necessary API keys. Right now you only need to get keys for the TMDB API, Jimaku API, which are free. This addon uses the AniList API as a backup, but that one doesn't need a key for publicly accessible data
>  - Enter those parameters inside a .env file like this (you don't need to install the dotenv npm package manually, the next steps will take care of project dependencies):
>    ```
>    TMDB_API_READ_TOKEN = yourTMDBAPIReadToken
>    TMDB_API_KEY = yourTMDBAPIkey
>    JIMAKU_API_KEY = yourJimakuAPIkey
>    ```
1. Clone the repo/dowload the code on your machine however you like, and navigate to the project's directory (where `package.json` resides)
2. Run the following command to install all necessary dependencies based on `package.json`:
   ```
   npm install
   ```
3. Run a local instance of the server.
> [!TIP]
> You can run a convenient instance of the project that will restart itself when you make changes to the files (after saving) using `nodemon`, with the preprogrammed devStart command (`nodemon index.js` under the hood) with:
> ```
> npm run devStart
> ```
5. Make requests to the app on localhost:3000 or by using Stremio

## Acknowledgements:
> [!NOTE]
> ![The Movie DataBase logo](https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_2-9665a76b1ae401a510ec1e0ca40ddcb3b0cfe45f1d51b77a308fea0845885648.svg)
> This application/addon uses TMDB and the TMDB APIs for IMDB ID's but is not endorsed, certified, or otherwise approved by TMDB.
>
> In case TMDB doesn't work, the [Cinemeta Stremio Addon](https://v3-cinemeta.strem.io/) will be used to get the item's metadata.
>
> <img src="https://jimaku.cc/static/icons/android-chrome-512x512.png" alt="Jimaku logo" height="100"/>
>
> This application/addon uses Jimaku and the Jimaku API but is not endorsed, certified, or otherwise approved by Jimaku.
>
> <img src="https://kitsunekko.net/favicon.ico" alt="kitsunekko logo" height="100"/>
>
> This application/addon uses kitsunekko by scrapping it for subtitle sources, but is not endorsed, certified, or otherwise approved by kitsunekko.
>
> <img src="https://yt3.ggpht.com/a-/AAuE7mBuEI3rUQY_s7MmzbnBmHMZxuCu11BJzISV8w=s900-mo-c-c0xffffffff-rj-k-no" alt="AniList logo" height="100"/>
>
> This application/addon uses AniList and the AniList API to get metadata, specially for MyAnimeList, AniDB, AniList and kitsu ID's. It is not endorsed, certified, or otherwise approved by AniList.
>
> <img src="https://upload.wikimedia.org/wikipedia/commons/7/7a/MyAnimeList_Logo.png" alt="MyAnimeList logo" height="100"/>
>
> This application/addon is able to process MyAnimeList ID's, but is not endorsed, certified, or otherwise approved by MyAnimeList.
>
> <img src="https://upload.wikimedia.org/wikipedia/commons/e/ec/AniDB_apple-touch-icon.png" alt="aniDB logo" height="100"/>
>
> This application/addon is able to process aniDB ID's, but is not endorsed, certified, or otherwise approved by aniDB.
>
> <img src="https://kitsu.app/kitsu-256-d4c4633df2c4745352100a4f0a7f5f9e.png" alt="kitsu logo" height="100"/>
>
> This application/addon is able to process kitsu ID's, but is not endorsed, certified, or otherwise approved by kitsu.


## TO DO:
- [ ] Publish to Stremio Addon Catalog (waiting for a response from the stremio team, because the beamup tool is not working for me)

### Enhancements/new features
- [X] Support MyAnimeList, AniDB, AniList and kitsu ID's and thus the kitsu Stremio addon (see [issue #2](/../../issues/2)) via [https://relations.yuna.moe/api/v2](https://relations.yuna.moe/api/v2)
- [ ] Touch up the views (the homepage, mainly)
- [ ] Investigate Stremio API

## Documentation used:
- [Stremio Addon guide](https://stremio.github.io/stremio-addon-guide/basics)
- [Stremio Addon docs](https://github.com/Stremio/stremio-addon-sdk/tree/master/docs)
- [TMDB API](https://developer.themoviedb.org/docs/getting-started)
- [Jimaku API docs](https://jimaku.cc/api/docs)
- [AniList API docs](https://docs.anilist.co/guide/graphql)
- Node.js docs
- Express.js docs
- [MDN docs](https://developer.mozilla.org/en-US/docs/Web)
- [JSDoc docs](https://jsdoc.app/)

Made with love for my friend Gonzalo