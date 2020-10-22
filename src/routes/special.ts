import router from './router'
import { Interface, Property } from '../models'
import Tree from './utils/tree'

const processRequest = async (properties: any, jsonObject: any, updateLog: Array<Object>) => {
  // properties.map((item: any) => {
    // (async () => {
      for (let i = 0; i < properties.length; i++) {
        let item: any = properties[i]
        if (item.type === 'Array' || item.type === 'Object') {
          let subObject = jsonObject === undefined ? {} : ((item.type === 'Array' && item.children.length) ? (jsonObject[item.name] || [{}])[0] : (jsonObject[item.name] || {}))
          // console.log(subObject)
          await processRequest(item.children, subObject, updateLog)
        } else {
          let element = {
            'name': item.name,
            'old': item.value,
            'new': jsonObject ? jsonObject[item.name] : "''|undefined",
            'updated': false,
            'skiped': false
          }
          if (jsonObject && jsonObject[item.name] !== '' && typeof jsonObject[item.name] !== 'undefined' && item.value != jsonObject[item.name]) {
            console.log(item.name, item.value, jsonObject[item.name], '!=', item.name != jsonObject[item.name])
            item.value = jsonObject[item.name]
            let affected = await Property.update(item, {
              where: { id: item.id },
            })
            if (affected[0]) element['updated'] = true
          } else {
            element['skiped'] = true
          }
          console.log(element)
          updateLog.push(element)
        }
      }
    // })()
  // })
}

router.post('/spec/request/params/update', async (ctx) => {
  const itfId = +ctx.query.id
  let body = ctx.request.body

  let itf
  if (itfId) {
    itf = await Interface.findByPk(itfId, {
      attributes: { exclude: [] },
    })
    itf = itf.toJSON()

    let scopes = ['request']
    for (let i = 0; i < scopes.length; i++) {
      let properties: any = await Property.findAll({
        attributes: { exclude: [] },
        where: { interfaceId: itf.id, scope: scopes[i] },
      })
      properties = properties.map(item => item.toJSON())
      // itf[scopes[i] + 'Properties'] = Tree.ArrayToTree(properties).children
      // itf[scopes[i] + 'OrgDataPreview'] = Tree.ArrayToTreeToTemplateToData(properties)

      let updateLog: Array<Object> = []
      await processRequest(Tree.ArrayToTree(properties).children, body, updateLog)
      itf['updateLog'] = updateLog
    }

    for (let i = 0; i < scopes.length; i++) {
      let updatedProperties: any = await Property.findAll({
        attributes: { exclude: [] },
        where: { interfaceId: itf.id, scope: scopes[i] },
      })
      updatedProperties = updatedProperties.map(item => item.toJSON())
      itf[scopes[i] + 'UpdatedProperties'] = Tree.ArrayToTree(updatedProperties).children
      itf[scopes[i] + 'UpdatedPreview'] = Tree.ArrayToTreeToTemplateToData(updatedProperties)
    }

    ctx.type = 'json'
    ctx.body = Tree.stringifyWithFunctonAndRegExp({ data: itf })
  } else {
    ctx.type = 'json'
    ctx.body = Tree.stringifyWithFunctonAndRegExp({ data: 'error itf id' })
  }
})
