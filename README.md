# [Buta no subs Stremio addon](stremio://buta-no-subs-stremio-addon.onrender.com/manifest.json)
<p align="center"><img src="https://i.imgur.com/VZK8qw2.jpeg" alt="Buta no subs logo" height="256"/></p>

Node.js & Express based addon trying to provide Japanese subtitles to Stremio. (I'm new to backend so I'm using it as a learning experience).

## Normal use:
### Install by clicking [this link](stremio://buta-no-subs-stremio-addon.onrender.com/manifest.json) or add <https://buta-no-subs-stremio-addon.onrender.com/manifest.json> to your addons
Whenever you start watching something on Stremio that matches some parameters set in the manifest (generated on [`index.js`](index.js)), the platform will call this addon. When the program can get the data for the item you are about to watch, each of the subtitle options (which are the different files) will appear in the subtitles menu under the japanese language in the ADDONS subsection, and will be labeled with a number so you can select which one to use.

> [!TIP]
> ### Recommendations:
> Learning japanese? There's also the [Strelingo Addon](https://github.com/Serkali-sudo), which lets you **see two subtitle languages at the same time** (English and Japanese, for example), and uses this addon as a provider for Japanese subs.

## Tips are welcome:
If you like the addon and would like to thank me monetarily, you can do so through ko-fi. Thank you!\
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M4M219PJVI)

## Use as a subtitle API:
> [!WARNING]  
> First of all, I need to say that this is not the intended use of this app. As you can read throughout this document, the intended use is to provide japanese subtitles according to the [Stremio spec](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineSubtitlesHandler.md). However, astute individuals may have gathered that with the right request, it can be used as a japanese subtitle API. If you are thinking about doing this:
> - Please consult me first: You can do this via this repo's Issue tab, or using the social links in my GitHub profile. Because this app uses **MY** API keys, I could get in trouble or rate limited by these API's, or even with Stremio because of excessive requests.
> - Fork/clone the repo and make your own instance: All the API's I've used are free, [nothing's stopping you from hosting your own instance](LICENSE)! Also, this way you won't share the request load this addon gets. In this case I'd ask you to change the logo and name and maybe credit me ([maybe even a tip?](#tips-are-welcome)), although *I think* legally you are not obligated to do any of those, but that wouldn't be very *cool* of you :rage:
Here's the path to call it (parameters are marked by being enclosed in {} and described below):
```
/subtitles/{type}/{ID}.json
```
Parameters
1. `type`: should not matter, but to make sure, use 'movie' or 'series' depending on what the item is
2. `ID`: Except for IMDB, different seasons have different ID's. Here we have some options:
   - `IMDB ID`: starts with "tt", followed by a number, always. If you are looking for a series, you can specify the season and episode numbers. Example: `tt5370118:1:2` *should* give results for Konosuba Season 1 Episode 2
   - `TMDB ID`: starts with "tmdb:", followed by a number, always. You can specify a season and episode number if you want. Example: `tmdb:65844:1:2` *should* give results for Konosuba Season 1 Episode 2
   - `kitsu ID`: starts with "kitsu:", followed by a number, always. You can specify an episode number if you want. Example: `kitsu:10941:2` *should* give results for Konosuba (Season 1 was specified with the kitsu ID) Episode 2
   - `AniList ID`: starts with "anilist:", followed by a number, always. You can specify an episode number if you want. Example: `anilist:21202:2` *should* give results for Konosuba (Season 1 was specified with the AniList ID) Episode 2
   - `MyAnimeList ID`: starts with "mal:", followed by a number, always. You can specify an episode number if you want. Example: `mal:30831:2` *should* give results for Konosuba (Season 1 was specified with the AniList ID) Episode 2
   - `aniDB ID`: starts with "anidb:", followed by a number, always. You can specify an episode number if you want. Example: `anidb:11261:2` *should* give results for Konosuba (Season 1 was specified with the AniList ID) Episode 2

## Run locally:
> [!IMPORTANT]
> 0. Previous steps/requirements:
>  - This project runs on Node.js, so install both Node.js and the npm (Node Package Manager)
>  - You'll need to get all necessary API keys. Right now you only need to get keys for the TMDB API and the Jimaku API [^API], which are free. This addon uses the AniList API and <https://relations.yuna.moe/api/v2> too, but those don't need a key/authentication for publicly accessible data
> [^API]: Because of how it works, you can *probably* (I have not tested this) get away with not setting these keys, and you'll just won't get subtitles from Jimaku, or be able to process IMDB ID (starting with "tt") based items.
>  - Enter your parameters inside a .env file like this: [^dotenv]
> [^dotenv]: You just need to make a file inside the top level repository folder, enter the required information and rename it ".env". You don't need to install the **dotenv** npm package manually, the next steps will take care of project dependencies.
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
5. Make requests to the app on localhost:3000 (or the port set in an environment variable if it exists) or by using Stremio, in which case you'll need to install the addon (just provide Stremio the manifest url: "https://localhost:3000/manifest.json", for example)

## Acknowledgements:
> [!NOTE]
> ![The Movie DataBase logo](https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_2-9665a76b1ae401a510ec1e0ca40ddcb3b0cfe45f1d51b77a308fea0845885648.svg)
> This application/addon uses TMDB and the TMDB API but is not endorsed, certified, or otherwise approved by TMDB.
>
> In case TMDB doesn't work, the [Cinemeta Stremio Addon](https://v3-cinemeta.strem.io/) will be used to get the item's metadata.
>
> <p align="center"><img src="https://jimaku.cc/static/icons/android-chrome-512x512.png" alt="Jimaku logo" height="100"/></p>
> This application/addon uses Jimaku and the Jimaku API but is not endorsed, certified, or otherwise approved by Jimaku.
>
> <p align="center"><img src="https://kitsunekko.net/favicon.ico" alt="kitsunekko logo" height="100"/></p>
> This application/addon uses kitsunekko by scrapping it for subtitle sources, but is not endorsed, certified, or otherwise approved by kitsunekko.
>
> ![MySubs logo](https://www.mysubs.org/logo.png)
> This application/addon uses MySubs as a source but is not endorsed, certified, or otherwise approved by TMDB.
>
> <p align="center"><img src="https://yt3.ggpht.com/a-/AAuE7mBuEI3rUQY_s7MmzbnBmHMZxuCu11BJzISV8w=s900-mo-c-c0xffffffff-rj-k-no" alt="AniList logo" height="100"/></p>
> This application/addon uses AniList and the AniList API to get metadata. It is not endorsed, certified, or otherwise approved by AniList.
>
> <p align="center"><img src="https://upload.wikimedia.org/wikipedia/commons/7/7a/MyAnimeList_Logo.png" alt="MyAnimeList logo" height="100"/></p>
> This application/addon is able to process MyAnimeList ID's, but is not endorsed, certified, or otherwise approved by MyAnimeList.
>
> <p align="center"><img src="https://upload.wikimedia.org/wikipedia/commons/e/ec/AniDB_apple-touch-icon.png" alt="aniDB logo" height="100"/></p>
> This application/addon is able to process aniDB ID's, but is not endorsed, certified, or otherwise approved by aniDB.
>
> <p align="center"><img src="https://kitsu.app/kitsu-256-d4c4633df2c4745352100a4f0a7f5f9e.png" alt="kitsu logo" height="100"/></p>
> This application/addon is able to process kitsu ID's, but is not endorsed, certified, or otherwise approved by kitsu.


## TO DO:
- [X] Publish to Stremio Addon Catalog (not on [Beam Up](https://eb33844c60da-jp-subs-stremio-addon.baby-beamup.club/manifest.json), because the beamup tool is not working for me)
- [ ] Support [my AnimeFLV addon](https://github.com/Pigamer37/animeflv-stremio-addon)'s ID's/slugs ("animeflv:{AnimeFLV-Slug}")

### Enhancements/new features
- [X] Support MyAnimeList, AniDB, AniList and kitsu ID's and thus the kitsu Stremio addon (see [issue #2](/../../issues/2)) via <https://relations.yuna.moe/api/v2>
- [X] Use <https://relations.yuna.moe/api/v2> to get AniList ID directly instead of passing through a title text search, because sometimes Jimaku/AniList return false positives when searching by title
- [X] Use [Mysubs-API](https://github.com/HasanAbbadi/mysubs-api/tree/master) as a source for extended results
- [ ] Investigate (and maybe support?) matchoo. See [japsub-api repo](https://github.com/HasanAbbadi/japsub-api/blob/master/scrapers/matchoo.js)
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

Made with love for my friend Gonzalo, who made [the fantastic addon logo](#buta-no-subs-stremio-addon)!
