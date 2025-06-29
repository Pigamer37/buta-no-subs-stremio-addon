const express = require("express")
const subtitles = express.Router()

require('dotenv').config()//process.env.var

const Metadata = require('./metadata_copy.js')
const jimakuAPI = require('./jimaku.js')
const aniListAPI = require('./anilist.js')
const kitsunekkoAPI = require('./kitsunekko.js')
const mySubsAPI = require('./mysubs.js')

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

  if (videoID?.startsWith("tt") || videoID?.startsWith("tmdb")) { //If we got an IMDB ID/TMDB ID
    let ID, idType
    if (videoID.startsWith("tmdb")) {
      idType = videoID
      ID = idDetails[1] //We want the second part of the videoID, which is the TMDB ID
      season = idDetails[2] //undefined if we don't get a season number in the query, which is fine
      episode = idDetails[3] //undefined if we don't get an episode number in the query, which is fine
    } else {
      idType = "imdb"
      ID = videoID //We want the IMDB ID as is
      season = idDetails[1] //undefined if we don't get a season number in the query, which is fine
      episode = idDetails[2] //undefined if we don't get an episode number in the query, which is fine
    }
    console.log(`\x1b[33mGot a ${req.params.type} with ${idType.toUpperCase()} ID:\x1b[39m ${ID}`)

    animeMetadataPromise = aniListAPI.GetAniListIDFromMOVIEDBID(idType, ID, season).catch((reason) => {
      //get title from TMDB or Cinemeta metadata
      console.error(`\x1b[31mDidn't get AniList entry from ${idType.toUpperCase()} ID because:\x1b[39m`, reason)
      //If we got an empty response, we don't want to try anything else, as it will probably return false positives
      if (reason.message === "Empty response!") {
        if (idType === "imdb") return { imdbID: ID } //If we got an IMDB ID, we can still try to get mySubs metadata
        else if (idType === "tmdb") return Metadata.GetTMDBMetaFromTMDBID(ID, req.params.type) //If we got a TMDB ID, we can still try to get mySubs metadata
        else throw reason //If we didn't get an IMDB ID and got an empty response from the relations API, there's nothing else we can do
      }
      console.log(`\x1b[33mGetting TMDB metadata for ${idType.toUpperCase()} ID:\x1b[39m`, ID)
      const tmdbMetaPromise = (idType === "imdb") ?
        Metadata.GetTMDBMeta(ID) : //If we got a IMDB ID
        Metadata.GetTMDBMetaFromTMDBID(ID, req.params.type); //If we got a TMDB ID
      return tmdbMetaPromise.then((TMDBmeta) => {
        console.log('\x1b[36mGot TMDB metadata:\x1b[39m', TMDBmeta.shortPrint())
        return TMDBmeta //We can use this to search for Jimaku subtitles
      }).catch((reason) => {
        console.error("\x1b[31mDidn't get TMDB metadata because:\x1b[39m " + reason)
        if (idType === "imdb") { //If we got an IMDB ID, we can try to get the Cinemeta metadata
          console.log(", trying Cinemeta...")
          return Metadata.GetCinemetaMeta(ID, req.params.type).then((Cinemeta) => {
            console.log('\x1b[36mGot Cinemeta metadata:\x1b[39m', Cinemeta.shortPrint())
            return Cinemeta //We can use this to search for Jimaku subtitles
          })
        } else throw reason
      }).catch((err) => { //only catches error from TMDB or Cinemeta API calls, which we want
        console.error('\x1b[31mFailed on metadata:\x1b[39m ' + err)
        res.json({ subtitles, message: "Failed getting media info" });
        next()
        throw err //We throw the error so we can catch it later
      }).then((meta) => { //Get the romaji title from the metadata, and additionally search for Jimaku or AniList id
        if (!meta.title) { throw Error("No title found in metadata!") } //If we don't have a title, we can't search for subtitles
        //If we have a season, append it to the title, because Jimaku, Anilist and kitsunekko treat them as different entries and use the season number in the title
        if (season !== undefined && season !== "1") { meta.title += ` ${season}` }
        console.log('\x1b[33mSearching for metadata in Jimaku for\x1b[39m', meta.title)
        return jimakuAPI.SearchForJimakuEntry(meta.title).then((entry) => {
          entry.imdbID = meta.imdbID
          return entry
        }).catch((reason) => {
          console.error("\x1b[31mDidn't get Jimaku entry because:\x1b[39m " + reason + ", \x1b[33msearching AniList...\x1b[39m")
          return aniListAPI.GetAniListEntry(meta.title).then((entry) => {
            entry.imdbID = meta.imdbID
            return entry
          }).catch((reason) => {
            console.error("\x1b[31mDidn't get AniList entry because:\x1b[39m", reason) //TODO: try "https://relations.yuna.moe/api/v2/imdb?id={IMDB ID}&include=anilist" to get AniList ID from IMDB ID
            throw reason
          })
        })
      })
    })
  } else if (videoID?.startsWith("animeflv")) { //If we got an AnimeFLV ID
    const ID = idDetails[1] //We want the second part of the videoID, which is the animeFLV slug
    const parsedSlug = ID.replaceAll("-", " ")
    episode = idDetails[2] //undefined if we don't get an episode number in the query, which is fine
    console.log(`\x1b[33mGot a ${req.params.type} with AnimeFLV ID:\x1b[39m ${ID}`)
    console.log('\x1b[33mSearching for metadata in Jimaku for\x1b[39m', parsedSlug)
    animeMetadataPromise = jimakuAPI.SearchForJimakuEntry(parsedSlug).catch((reason) => {
      console.error("\x1b[31mDidn't get Jimaku entry because:\x1b[39m " + reason + ", \x1b[33msearching AniList...\x1b[39m")
      return aniListAPI.GetAniListEntry(parsedSlug).catch((reason) => {
        console.error("\x1b[31mDidn't get AniList entry because:\x1b[39m", reason)
        throw reason
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

  console.log('Extra parameters:', res.locals.extraParams)
  animeMetadataPromise.then((animeMetadata) => {
    if (!animeMetadata) { throw Error("No anime metadata found!") } //If we don't have metadata, we can't search for subtitles
    let jimakuPromise, kitsunekkoPromise, mySubsPromise
    if (animeMetadata.anilist_id) {
      console.log('\x1b[36mGot anime with AniList ID:\x1b[39m', animeMetadata.anilist_id)
      //if we got the Jimaku ID already, the object will have an id property, and we can use it as is, otherwise try to get the Jimaku ID through the AniList ID
      const jimakuEntryPromise = (animeMetadata.id) ?
        Promise.resolve(animeMetadata) :
        jimakuAPI.GetJimakuEntryFromAniList(animeMetadata.anilist_id).catch((err) => {
          console.error('\x1b[31mFailed getting Jimaku entry form AniList ID:\x1b[39m ' + err)
        });
      jimakuPromise = jimakuEntryPromise.then((jimakuEntry) => {
        console.log('\x1b[36mGot Jimaku entry:\x1b[39m', jimakuEntry.id)
        console.log('\x1b[33mSearching for subtitle files in Jimaku...\x1b[39m')
        return jimakuAPI.GetJimakuFiles(jimakuEntry.id, episode).then((jimakuFiles) => {
          console.log(`\x1b[36mGot ${jimakuFiles.length} Jimaku files\x1b[39m`)
          subtitles = subtitles.concat(jimakuFiles) //Concat the files to the subtitles array
        }).catch((err) => {
          console.error('\x1b[31mFailed getting Jimaku files:\x1b[39m ' + err)
        })
      })
      const romajiPromise = (animeMetadata.name) ?
        Promise.resolve(animeMetadata) :
        aniListAPI.GetAniListEntryByID(animeMetadata.anilist_id).catch((err) => {
          console.error('\x1b[31mFailed getting AniList entry form AniList ID:\x1b[39m ' + err)
          throw err //We throw the error so we can catch it later
        });
      kitsunekkoPromise = romajiPromise.then((animeMeta) => {
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
    } else { jimakuPromise = kitsunekkoPromise = Promise.reject(Error("No AniList ID!")) }

    if (animeMetadata.imdbID || animeMetadata.engTitle || animeMetadata.title) {
      console.log('\x1b[33mSearching for subtitle files in MySubs...\x1b[39m')
      mySubsPromise = mySubsAPI.GetMySubs(animeMetadata.imdbID || animeMetadata.engTitle, season, episode).then((mySubs) => {
        console.log(`\x1b[36mGot ${mySubs.length} MySubs files\x1b[39m`)
        subtitles = subtitles.concat(mySubs) //Concat the files to the subtitles array
      }).catch((err) => {
        console.error('\x1b[31mFailed getting MySubs subtitles:\x1b[39m ' + err)
      })
    } else {
      console.log('\x1b[31mGot no IMDB ID or english title to search for in MySubs...\x1b[39m')
      mySubsPromise = Promise.reject(Error("No IMDB ID or English title!"))
    }

    Promise.allSettled([jimakuPromise, kitsunekkoPromise, mySubsPromise]).then(() => {
      console.log(`\x1b[36mGot ${subtitles.length} subtitles\x1b[39m`)
      if (subtitles.length < 1) {
        res.json({ subtitles, message: "No subtitles found" });
        next()
      } else {
        res.json({ subtitles, cacheMaxAge: 10800, staleRevalidate: 3600, staleError: 259200, message: "Got Japanese subtitles!" });
        next()
      }
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