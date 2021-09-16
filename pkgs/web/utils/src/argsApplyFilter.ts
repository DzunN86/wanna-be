import lastDayOfMonth from 'date-fns/lastDayOfMonth'
import startOfMonth from 'date-fns/startOfMonth'
import find from 'lodash.find'
import startCase from 'lodash.startcase'

export const argsApplyFilter = (structure, filterCols, form) => {
  Object.keys(structure.args).map((key) => {
    const arg = structure.args[key]
    if (arg.indexOf('$') === 0 && arg.indexOf(':') > 0) {
      const name = arg.split('$')[1].split(':')[0]
      const type = arg.split(':')[1]
      const opt = arg.split(':')[2]
      if (type === 'from' || type === 'to') {
        const item = find(filterCols, { key: name })
        const operator = opt || 'monthly'
        if (!form[key]) {
          switch (operator) { 
            case 'monthly':
              if (type === 'from') {
                form[key] = { 
                  _mode: 'args',
                  value: startOfMonth(new Date()), 
                }
              } else if (type === 'to') {
                form[key] = {
                  _mode: 'args',
                  value: lastDayOfMonth(new Date()),
                }
              }
              break
          }
        }

        if (item) {
          item._args[type] = key
        } else {
          filterCols.unshift({
            key: name,
            name: startCase(name),
            _args: {
              type: 'date',
              operator,
              [type]: key,
            },
            filter: {
              type: 'date',
              onlyBetween: true,
              operator,
            },
            maxWidth: 200,
          })
        }
      }
    }
  })
}
