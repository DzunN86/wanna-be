/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import {
  ConstrainMode,
  DetailsList,
  DetailsListLayoutMode,
  ProgressIndicator,
  SelectionMode,
} from '@fluentui/react'
import { waitUntil } from 'libs'
import get from 'lodash.get'
import { useEffect, useRef } from 'react'
import { TableWrapper } from './Table'
import { IQLTable } from '../../ext/types/list'
import { formatColumns } from './utils/formatColumns'
import { renderItem } from './utils/renderItem'

export const QLTable = ({
  meta,
  onRowClick,
  columns,
  wrapper,
}: IQLTable & {
  meta: any
}) => {
  let selMode = SelectionMode.none
  const skipRender = useRef(false)
  const _ref = useRef(null)
  const _onShouldVirt = () => true
  const _onColHeadClick = (ev?: React.MouseEvent<HTMLElement>, fcol?: any) => {
    if (fcol) {
      meta.sort(fcol.fieldName)
      skipRender.current = true
      meta.query()
    }
  }
  const _onRenderRow = (rowProps, defaultRender) => {
    if (defaultRender) {
      const _onClick = (ev) => {
        if (onRowClick && rowProps)
          onRowClick(rowProps.item, rowProps.itemIndex, ev)
      }

      const children = (
        <div className={onRowClick ? `cursor-pointer ` : ``} onClick={_onClick}>
          {defaultRender(rowProps)}
        </div>
      )
      if (wrapper) {
        return wrapper({ children, row: rowProps.item })
      }
      return children
    }
    return null
  }

  const scroll = meta.scroll

  useEffect(() => {
    waitUntil(() => get(_ref, 'current._root.current')).then(() => {
      const el = get(_ref, 'current._root.current')
      if (el) {
        const grid = el.children[0]
        grid.scrollTop = scroll.top
        grid.scrollLeft = scroll.left

        let trycount = 0
        let tryset: any = setInterval(() => {
          grid.scrollTop = scroll.top
          grid.scrollLeft = scroll.left
          trycount++

          if (
            trycount > 100 ||
            (scroll.top === grid.scrollTop && scroll.left === grid.scrollLeft)
          )
            clearInterval(tryset)
        }, 10)
        grid.onscroll = (e) => {
          if (tryset) {
            clearInterval(tryset)
            tryset = undefined
          }
          e.target.children[0].style.top = e.target.scrollTop + 'px'
          meta.scroll.top = e.target.scrollTop
          meta.scroll.left = e.target.scrollLeft
        }
      }
    })
  }, [_ref.current])
  const _onRenderItem = renderItem.bind({ columns, meta })
  const _columns = formatColumns(
    Array.isArray(columns) ? columns : [],
    meta.params
  )

  return (
    <TableWrapper selMode="single">
      {meta.loading && (
        <ProgressIndicator
          css={css`
            position: absolute !important;
            top: 0px;
            left: 0px;
            right: 0px;
            z-index: 20;
            pointer-events: none;
            > div {
              margin: 0px;
              padding: 0px;
            }
          `}
        />
      )}
      <DetailsList
        css={css`
          .ms-DetailsRow-cell {
            display: flex;
            flex-direction: row;
            align-items: center;
            font-size: 14px;
          }
          .ms-DetailsHeader {
            padding-top: 0px;
          }
        `}
        selectionMode={selMode}
        items={meta.loading ? [] : meta.list}
        componentRef={_ref}
        onShouldVirtualize={_onShouldVirt}
        compact={true}
        layoutMode={DetailsListLayoutMode.justified}
        onColumnHeaderClick={_onColHeadClick}
        columns={_columns}
        onRenderRow={_onRenderRow}
        onRenderItemColumn={_onRenderItem}
      />
    </TableWrapper>
  )
}
