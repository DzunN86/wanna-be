import { Fragment, isValidElement } from 'react'

export const formatJsxChildren = function (raw, idx) {
  const formatSingle = (e, key) => {
    if (typeof e === 'object' && e !== null) {
      if (isValidElement(e)) {
        if (!e.key) {
          return <Fragment key={key}>{e}</Fragment>
        }
        return e
      } else {
        return (
          <pre className="max-w-2xl p-2 text-xs break-words whitespace-pre-wrap">
            {JSON.stringify(e, null, 2)}
          </pre>
        )
      }
    }
    return e
  }

  const formatArray = (e: any[]) => {
    return e.map((single, idx) => {
      if (Array.isArray(single)) {
        return formatArray(single)
      }

      return formatSingle(single, idx)
    })
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0 || (raw.length > 0 && isValidElement(raw[0]))) {
      return formatArray(raw)
    } else {
      return (
        <pre className="max-w-2xl p-2 text-xs break-words whitespace-pre-wrap">
          {JSON.stringify(raw, null, 2)}
        </pre>
      )
    }
  }

  return formatSingle(raw, idx)
}
