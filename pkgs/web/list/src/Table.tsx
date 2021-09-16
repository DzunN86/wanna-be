/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import {
  CheckboxVisibility,
  DetailsList,
  MarqueeSelection,
  Selection,
  SelectionMode,
} from '@fluentui/react'
import { waitUntil } from 'libs'
import get from 'lodash.get'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef } from 'react'
import type { IQLTable } from '../../ext/types/list'
import { formatColumns } from './utils/formatColumns'
import { renderItem } from './utils/renderItem'

export const Table = observer(
  ({
    onRowClick,
    items,
    columns,
    selMode,
    selected,
    onSelect,
    className,
    showHeader,
  }: IQLTable & {
    showHeader?: boolean
    items: any[]
    selMode?: 'multi' | 'single' | 'none'
    selected?: any
    onSelect?: (s: Selection) => void
  }) => {
    if (!selMode) {
      if (onSelect) {
        selMode = 'single'
      } else {
        selMode = 'none'
      }
    }

    const _ref = useRef(null)
    const _onShouldVirt = () => true
    const _onRenderRow = (rowProps, defaultRender) => {
      if (defaultRender) {
        const _onClick = (ev) => {
          if (onRowClick && rowProps) onRowClick(rowProps.item, 0, ev)
        }
        return (
          <div
            className={onRowClick ? `cursor-pointer ` : ``}
            onClick={_onClick}
          >
            {defaultRender(rowProps)}
          </div>
        )
      }
      return null
    }
    const _scroll = useRef({ left: 0, top: 0 })
    const scroll = _scroll.current

    useEffect(() => {
      waitUntil(() => get(_ref, 'current._root.current')).then(() => {
        const el = get(_ref, 'current._root.current')
        if (el) {
          // handle scrolling
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
            _scroll.current = {
              top: e.target.scrollTop,
              left: e.target.scrollLeft,
            }
          }
        }
      })
    }, [_ref.current])

    const _columns = formatColumns(
      columns || (items && items.length > 0 ? Object.keys(items[0]) : []),
      {}
    )

    const _onRenderItem = renderItem.bind({ columns: columns || _columns })

    const selectionRef = useRef(
      new Selection({
        canSelectItem: () => {
          return true
        },
        getKey: (e) => {
          if (typeof e.id !== 'undefined') {
            return e.id || '___'
          } else {
            return e[Object.keys(e)[0]] || '___'
          }
        },
        onSelectionChanged: () => {
          const s = selectionRef.current
          if (onSelect) {
            if ((selectionRef as any).current.initialSelection) {
              ;(selectionRef as any).current.initialSelection = false
              return
            }

            if (selMode === 'single') {
              onSelect(s.getSelection()[0])
            } else {
              onSelect(s)
            }
          }
        },
      })
    )

    useEffect(() => {
      if (selMode !== 'none' && selected) {
        if (
          typeof (selectionRef as any).current.initialSelection === 'undefined'
        ) {
          ;(selectionRef as any).current.initialSelection = true
        }
        if (!Array.isArray(selected)) {
          console.log(selectionRef.current.getKey(selected))
          selectionRef.current.setKeySelected(
            selectionRef.current.getKey(selected),
            true,
            true
          )
        }
      }
    }, [selected])

    const component = (
      <DetailsList
        selectionMode={
          {
            multi: SelectionMode.multiple,
            single: SelectionMode.single,
            none: SelectionMode.none,
          }[selMode]
        }
        selection={selMode !== 'none' ? selectionRef.current : undefined}
        selectionPreservedOnEmptyClick={true}
        items={items}
        componentRef={_ref}
        onShouldVirtualize={_onShouldVirt}
        compact={true}
        checkboxVisibility={CheckboxVisibility.hidden}
        onRenderDetailsHeader={
          showHeader === false
            ? () => {
                return null
              }
            : undefined
        }
        columns={_columns}
        onRenderRow={_onRenderRow}
        onRenderItemColumn={_onRenderItem}
      />
    )

    return (
      <TableWrapper
        selMode={selMode}
        className={className}
        showHeader={showHeader}
      >
        {selMode === 'multi' ? (
          <MarqueeSelection selection={selectionRef.current}>
            {component}
          </MarqueeSelection>
        ) : (
          component
        )}
      </TableWrapper>
    )
  }
)

export const TableWrapper = ({
  children,
  className,
  showHeader,
  selMode,
}: {
  showHeader?: boolean
  children: any
  className?: string
  selMode: 'multi' | 'single' | 'none'
}) => {
  return (
    <div
      className={className}
      css={css`
        display: flex;
        flex-direction: column;
        position: relative;
        flex: 1;

        > div,
        .ms-Viewport,
        .ms-DetailsList,
        .ms-DetailsList > div,
        .ms-DetailsList-contentWrapper {
          display: flex;
          flex: 1;
          flex-direction: column;
          position: relative;
        }

        .ms-DetailsList-headerWrapper {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
        }

        .ms-DetailsList-headerWrapper > div {
          padding-top: 0;
          border-top: 1px solid #ececeb;
        }

        .ms-DetailsList > div {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          top: 0;
          display: flex;
          min-width: auto;
          overflow-y: auto;
          overflow-x: auto;
          padding-top: ${showHeader === false ? '0px' : '45px'};
        }
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
    >
      {children}
    </div>
  )
}
