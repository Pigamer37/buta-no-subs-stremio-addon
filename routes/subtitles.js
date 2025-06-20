const express = require("express")
const subtitles = express.Router()

require('dotenv').config()//process.env.var

const Metadata = require('./metadata_copy.js')
const jimakuAPI = require('./jimaku.js')
const aniListAPI = require('./anilist.js')
const kitsunekkoAPI = require('./kitsunekko.js')

/**
 * Tipical express middleware callback.
 * @callback subRequestMiddleware
 * @param req - Request sent to our router, containing all relevant info
 * @param res - Our response
 * @param {function} [next] - The next middleware function in the chain, should end the response at some point
 */
/** 
 * Handles requests to /subtitles that contain extra parameters, we should append them to the request for future middleware, see {@link SearchParamsRegex} to see how these are handled
 * @param req - Request sent to our router, containing all relevant info
 * @param res - Our response, we don't end it because this function/middleware doesn't handle the full request!
 * @param {subRequestMiddleware} next - REQUIRED: The next middleware function in the chain, should end the response at some point
 */
function HandleLongSubRequest(req, res, next) {
  console.log(`\x1b[96mEntered HandleLongSubRequest with\x1b[39m ${req.originalUrl}`)
  res.locals.extraParams = SearchParamsRegex(req.params[0])
  next()
}
/** 
 * Handles requests to /subtitles whether they contain extra parameters (see {@link HandleLongSubRequest} for details on this) or just the type and videoID.
 * @param req - Request sent to our router, containing all relevant info
 * @param res - Our response, note we use next() just in case we need to add middleware, but the response is handled by sending an empty subtitles Object.
 * @param {subRequestMiddleware} [next] - The next middleware function in the chain, can be empty because we already responded with this middleware
 */
function HandleSubRequest(req, res, next) {
  console.log(`\x1b[96mEntered HandleSubRequest with\x1b[39m ${req.originalUrl}`)
  const idDetails = req.params.videoId.split(':')
  const videoID = idDetails[0] //We only want the first part of the videoID, which is the IMDB ID, the rest would be the season and episode
  let episode, season, animeMetadataPromise
  let subtitles = []

  if (videoID?.startsWith("tt")) { //If we got an IMDB ID
    season = idDetails[1] //undefined if we don't get a season number in the query, which is fine
    episode = idDetails[2] //undefined if we don't get an episode number in the query, which is fine
    console.log(`\x1b[33mGot a ${req.params.type} with ID:\x1b[39m ${videoID}`)
    console.log('Extra parameters:', res.locals.extraParams)

    //get title from TMDB or Cinemeta metadata
    console.log('\x1b[33mGetting TMDB metadata for IMDB ID:\x1b[39m', videoID)
    const titlePromise = Metadata.GetTMDBMeta(videoID).then((TMDBmeta) => {
      console.log('\x1b[36mGot TMDB metadata:\x1b[39m', TMDBmeta.shortPrint())
      return TMDBmeta.title //We can use this to search for Jimaku subtitles
    }).catch((reason) => {
      console.error("\x1b[31mDidn't get TMDB metadata because:\x1b[39m " + reason + ", trying Cinemeta...")
      return Metadata.GetCinemetaMeta(videoID, req.params.type).then((Cinemeta) => {
        console.log('\x1b[36mGot Cinemeta metadata:\x1b[39m', Cinemeta.shortPrint())
        return Cinemeta.title //We can use this to search for Jimaku subtitles
      })
    }).catch((err) => { //only catches error from TMDB or Cinemeta API calls, which we want
      console.error('\x1b[31mFailed on metadata:\x1b[39m ' + err)
      res.json({ subtitles, message: "Failed getting media info" });
      next()
      throw err //We throw the error so we can catch it later
    })
    //Get the romaji title from the metadata, and additionally search for Jimaku or AniList id
    animeMetadataPromise = titlePromise.then((title) => {
      if (!title) { throw Error("No title found in metadata!") } //If we don't have a title, we can't search for subtitles
      //If we have a season, append it to the title, because Jimaku, Anilist and kitsunekko treat them as different entries and use the season number in the title
      if (season !== undefined && season !== "1") { title += ` ${season}` }
      console.log('\x1b[33mSearching for metadata in Jimaku for\x1b[39m', title)
      return jimakuAPI.SearchForJimakuEntry(title).catch((reason) => {
        console.error("\x1b[31mDidn't get Jimaku entry because:\x1b[39m " + reason + ", \x1b[33msearching AniList...\x1b[39m")
        return aniListAPI.GetAniListEntry(title).catch((reason) => {
          console.error("\x1b[31mDidn't get AniList entry because:\x1b[39m " + reason) //TODO: try "https://relations.yuna.moe/api/v2/imdb?id={IMDB ID}&include=anilist" to get AniList ID from IMDB ID
          throw reason
        })
      })
    })
  } else if (videoID == "anilist") {
    const ID = idDetails[1]
    episode = idDetails[2] //undefined if we don't get an episode number in the query, which is fine
    console.log(`\x1b[33mGot a ${req.params.type} with AniList ID:\x1b[39m ${ID}`)
    animeMetadataPromise = aniListAPI.GetAniListEntryByID(ID).catch((reason) => {
      console.error("\x1b[31mDidn't get AniList entry from ID because:\x1b[39m " + reason) //TODO: try "https://relations.yuna.moe/api/v2/imdb?id={IMDB ID}&include=anilist" to get AniList ID from IMDB ID
      return { anilist_id: ID } //we couldn't get the AniList entry (with the romaji name), but we can still fulfill the request with the ID
    })
  } else if (videoID.match(/^(?:kitsu|mal|anidb)$/)) { //If we got a kitsu, mal or anidb ID
    const ID = idDetails[1] //We want the second part of the videoID, which is the kitsu ID
    episode = idDetails[2] //undefined if we don't get an episode number in the query, which is fine
    console.log(`\x1b[33mGot a ${req.params.type} with ${videoID} ID:\x1b[39m ${ID}`)
    animeMetadataPromise = aniListAPI.GetAniListIDFromANIMEID(videoID, ID).catch((reason) => {
      console.error("\x1b[31mDidn't get AniList entry from", videoID, "ID because:\x1b[39m " + reason)
      throw reason //We throw the error so we can catch it later
    })
  } else { if (!res.headersSent) { res.json({ subtitles, message: "Wrong ID format, check manifest for errors" }); next() } }

  animeMetadataPromise.then((animeMetadata) => {
    if (!animeMetadata) { throw Error("No anime metadata found!") } //If we don't have metadata, we can't search for subtitles
    console.log('\x1b[36mGot anime with AniList ID:\x1b[39m', animeMetadata.anilist_id)
    //if we got the Jimaku ID already, the object will have an id property, and we can use it as is, otherwise try to get the Jimaku ID through the AniList ID
    const jimakuEntryPromise = (animeMetadata.id) ?
      Promise.resolve(animeMetadata) :
      jimakuAPI.GetJimakuEntryFromAniList(animeMetadata.anilist_id).catch((err) => {
        console.error('\x1b[31mFailed getting Jimaku entry form AniList ID:\x1b[39m ' + err)
      });
    const jimakuPromise = jimakuEntryPromise.then((jimakuEntry) => {
      console.log('\x1b[36mGot Jimaku entry:\x1b[39m', jimakuEntry.id)
      console.log('\x1b[33mSearching for subtitle files in Jimaku...\x1b[39m')
      return jimakuAPI.GetJimakuFiles(jimakuEntry.id, episode).then((jimakuFiles) => {
        console.log(`\x1b[36mGot ${jimakuFiles.length} Jimaku files\x1b[39m`)
        subtitles = subtitles.concat(jimakuFiles) //Concat the files to the subtitles array
      }).catch((err) => {
        console.error('\x1b[31mFailed getting Jimaku files:\x1b[39m ' + err)
      })
    })
    const kitsunekkoRomajiPromise = (animeMetadata.name) ?
      Promise.resolve(animeMetadata) :
      aniListAPI.GetAniListEntryByID(animeMetadata.anilist_id).catch((err) => {
        console.error('\x1b[31mFailed getting AniList entry form AniList ID:\x1b[39m ' + err)
      });
    const kitsunekkoPromise = kitsunekkoRomajiPromise.then((animeMeta) => {
      return kitsunekkoAPI.SearchForKitsunekkoEntry(animeMeta.name).then((foundAnime) => {
        console.log('\x1b[33mSearching for subtitle files in kitsunekko...\x1b[39m')
        return kitsunekkoAPI.GetKitsunekkoSubtitles(foundAnime.url, episode, season).then((kitsunekkoSubs) => {
          console.log(`\x1b[36mGot ${kitsunekkoSubs.length} kitsunekko files\x1b[39m`)
          subtitles = subtitles.concat(kitsunekkoSubs) //Concat the files to the subtitles array
        })
      }).catch((err) => {
        console.error('\x1b[31mFailed getting kitsunekko subtitles:\x1b[39m ' + err)
      })
    })

    Promise.allSettled([jimakuPromise, kitsunekkoPromise]).then(() => {
      console.log(`\x1b[36mGot ${subtitles.length} subtitles\x1b[39m`)
      res.json({ subtitles, cacheMaxAge: 10800, staleRevalidate: 3600, staleError: 259200, message: "Got Japanese subtitles!" });
      next()
    })
  }).catch((err) => {
    console.error('\x1b[31mFailed on anime metadata gathering:\x1b[39m ' + err)
    if (!res.headersSent) {
      res.json({ subtitles, message: "Failed getting item info" });
      next()
    }
  })
}
/** 
 * Parses the extra config parameter we can get when the addon is configured
 * @param req - Request sent to our router, containing all relevant info
 * @param res - Our response, note we use next() just in case we need to add middleware
 * @param {subRequestMiddleware} [next] - The next middleware function in the chain
 */
function ParseConfig(req, res, next) {
  console.log(`\x1b[96mEntered ParseConfig with\x1b[39m ${req.originalUrl}`)
  res.locals.config = new URLSearchParams(decodeURIComponent(req.params.config))
  console.log('Config parameters:', res.locals.config)
  next()
}
//Configured requests
subtitles.get("/:config/subtitles/:type/:videoId/*.json", ParseConfig, HandleLongSubRequest, HandleSubRequest)
subtitles.get("/:config/subtitles/:type/:videoId.json", ParseConfig, HandleSubRequest)
//Unconfigured requests
subtitles.get("/subtitles/:type/:videoId/*.json", HandleLongSubRequest, HandleSubRequest)
subtitles.get("/subtitles/:type/:videoId.json", HandleSubRequest)
/** 
 * Parses the capture group corresponding to URL parameters that stremio might send with its request. Tipical extra info is a dot separated title, the video hash or even file size
 * @param {string} extraParams - The string captured by express in req.params[0] in route {@link subtitles.get("/:type/:videoId/*.json", HandleLongSubRequest, HandleSubRequest)}
 * @return {Object} Empty if we passed undefined, populated with key/value pairs corresponding to parameters otherwise
 */
function SearchParamsRegex(extraParams) {
  //console.log(`\x1b[33mfull extra params were:\x1b[39m ${extraParams}`)
  if (extraParams !== undefined) {
    const paramMap = new Map()
    const keyVals = extraParams.split('&');
    for (let keyVal of keyVals) {
      const keyValArr = keyVal.split('=')
      const param = keyValArr[0]; const val = keyValArr[1];
      paramMap.set(param, val)
    }
    const paramJSON = Object.fromEntries(paramMap)
    //console.log(paramJSON)
    return paramJSON
  } else return {}
}

module.exports = subtitles;