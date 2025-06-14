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
  `;
  /**
   * @param {String} titleStr - The title to search for in AniList
   * @returns {Promise<Number>} - The AniList ID of the first result for the given title
   */
exports.GetAniListID = async function (titleStr) {
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
    //return id of first result
    return data.data.Media.id
  })
}