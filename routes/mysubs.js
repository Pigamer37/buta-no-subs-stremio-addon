/**
 * 
 * @param {String} query -either exact title or IMDB ID 
 * @returns 
 */
exports.GetMySubs = async function (query, season = undefined, episode = undefined) {
  let reqUrl = `https://mysubs-api.vercel.app/search/${query}?lang=Japanese`
  if(season !== undefined) reqUrl += `&s=${season}`
  if(episode !== undefined) reqUrl += `&e=${episode}`
  return fetch(reqUrl).then((res) => {
    if ((!res.ok) || res.status !== 200) throw Error(`HTTP error! Status: ${res.status}`)
    if (res === undefined) throw Error(`Undefined response!`)
    return res.json().then((data) => {
      if (data === undefined || !data[0]) throw Error("Empty response!")
      //add 2000 to the ID to avoid conflicts with other subtitle providers
      return data.map((subEntry, idx) => { return { id: idx + 2001, url: `https://www.mysubs.org/get-subtitle/${subEntry.id}`, lang: "jpn" } })
    })
  })
}