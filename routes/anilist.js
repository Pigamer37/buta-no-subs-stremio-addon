const ANILIST_API_BASE = "https://graphql.anilist.co"
const SearchQuery = `
query ($search: String!) {
  Media(search: $search, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
  }
}
`, IDQuery = `
query ($id: Int) {
  Media (id: $id, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
  }
}
`;
const ID_RELATIONS_API_BASE = "https://relations.yuna.moe/api/v2";
/**
 * @param {String} titleStr - The title to search for in AniList
 * @returns {Promise<Number>} - The AniList entry of the first result for the given title
 */
exports.GetAniListEntry = async function (titleStr) {
  let variables = { search: titleStr };
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: SearchQuery,
      variables: variables
    })
  }
  return fetch(`${ANILIST_API_BASE}`, options).then((resp) => {
    if ((!resp.ok) || resp.status !== 200) throw Error(`HTTP error! Status: ${resp.status}`)
    if (resp === undefined) throw Error(`Undefined response!`)
    return resp.json()
  }).then((data) => {
    if (data === undefined) throw Error("Invalid response!")
    //return first result
    return { anilist_id: data.data.Media.id, name: data.data.Media.title.romaji }
  })
}

exports.GetAniListEntryByID = async function (aniListID) {
  let variables = { id: aniListID };
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: IDQuery,
      variables: variables
    })
  }
  return fetch(`${ANILIST_API_BASE}`, options).then((resp) => {
    if ((!resp.ok) || resp.status !== 200) throw Error(`HTTP error! Status: ${resp.status}`)
    if (resp === undefined) throw Error(`Undefined response!`)
    return resp.json()
  }).then((data) => {
    if (data === undefined) throw Error("Invalid response!")
    //return first result
    return { anilist_id: data.data.Media.id, name: data.data.Media.title.romaji }
  })
}

exports.GetAniListIDFromANIMEID = async function (IDType, ID) {
  //get anilist ID from any supported anime-like ID (kitsu, mal, anidb)
  const reqURL = `${ID_RELATIONS_API_BASE}/ids?source=${(IDType === 'mal') ? 'myanimelist' : IDType}&id=${ID}&include=anilist`
  return fetch(reqURL).then((resp) => {
    if ((!resp.ok) || resp.status !== 200) throw Error(`HTTP error! Status: ${resp.status}`)
    if (resp === undefined) throw Error(`Undefined response!`)
    return resp.json()
  }).then((data) => {
    if (data === undefined) throw Error("Invalid response!")
    //return first result
    return { anilist_id: data.anilist }
  })
}

exports.GetAniListIDFromIMDBID = async function (ID, season = undefined) {
  //get anilist ID from IMDB ID
  const reqURL = `${ID_RELATIONS_API_BASE}//imdb?id=${ID}&include=anilist,anime-planet`
  return fetch(reqURL).then((resp) => {
    if ((!resp.ok) || resp.status !== 200) throw Error(`HTTP error! Status: ${resp.status}`)
    if (resp === undefined) throw Error(`Undefined response!`)
    return resp.json()
  }).then((data) => {
    if (data === undefined) throw Error("Invalid response!")
    if ((season !== undefined) && (data.length > 1)) { //if we have a season number and multiple results search for the right season
      for (const result of data) { //take advantage of animeplanet's slug info
        if (result["anime-planet"] && result["anime-planet"].endsWith(season.toString())) { //"anime-planet": "konosuba-gods-blessing-on-this-wonderful-world-2"
          return { anilist_id: result.anilist }
        }
      }//we didn't get a match, throw error to search by name
      throw Error(`No matching season found for IMDB ID ${ID} and season ${season}`)
    } else return { anilist_id: data[0].anilist } //return first result
  })
}