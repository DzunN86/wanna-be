/** @jsx jsx */
import { css, jsx } from '@emotion/react'
import { Label } from '@fluentui/react'
import { FocusZone } from '@fluentui/react/lib/FocusZone'
import { List } from '@fluentui/react/lib/List'
import { getTheme, ITheme, mergeStyleSets } from '@fluentui/react/lib/Styling'
import type { IRectangle } from '@fluentui/react/lib/Utilities'
import { useCallback, useRef } from 'react'
import { observer, useLocalObservable } from 'mobx-react-lite'
import { action } from 'mobx'

export const FileManagerList = observer((props: any) => {
  const { datas, fixPath, selected, onSelected } = props
  const columnCount = useRef(0)
  const rowHeight = useRef(0)

  const theme: ITheme = getTheme()
  const { palette, fonts } = theme
  const ROWS_PER_PAGE = 3
  const MAX_ROW_HEIGHT = 250
  const classNames = mergeStyleSets({
    listGridExample: {
      overflow: 'hidden',
      fontSize: 0,
      position: 'relative',
    },
    listGridExampleTile: {
      textAlign: 'center',
      outline: 'none',
      position: 'relative',
      float: 'left',
      // background: palette.neutralLighter,
      selectors: {
        'focus:after': {
          content: '',
          position: 'absolute',
          left: 2,
          right: 2,
          top: 2,
          bottom: 2,
          boxSizing: 'border-box',
          border: `1px solid ${palette.white}`,
        },
      },
    },
    listGridExampleSizer: {
      paddingBottom: '100%',
    },
    listGridExamplePadder: {
      position: 'absolute',
      left: 2,
      top: 2,
      right: 2,
      bottom: 2,
    },
    listGridExampleLabel: {
      // background: 'rgba(0, 0, 0, 0.3)',
      color: '#FFFFFF',
      position: 'absolute',
      padding: 10,
      bottom: 0,
      left: 0,
      width: '100%',
      fontSize: fonts.small.fontSize,
      boxSizing: 'border-box',
    },
    listGridExampleImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
    },
  })

  const getPageHeight = useCallback((): number => {
    // if (!isNaN(rowHeight.current)) {
    return rowHeight.current * ROWS_PER_PAGE
    // } else {
    //     return 100
    // }
  }, [])

  const getItemCountForPage = useCallback(
    (itemIndex?: number, surfaceRect?: IRectangle) => {
      if (itemIndex === 0 && surfaceRect) {
        columnCount.current = Math.ceil(surfaceRect.width / MAX_ROW_HEIGHT)
        rowHeight.current = Math.floor(surfaceRect.width / columnCount.current)
      }

      return columnCount.current * ROWS_PER_PAGE
    },
    []
  )

  const meta = useLocalObservable(() => ({
    fallbackImage: [] as string[],
  }))

  const onRenderCell = useCallback((item: any, index: number | undefined) => {
    const name = item.name
    const ext = item.name.split('.').pop() || ''

    return (
      <div
        className={classNames.listGridExampleTile}
        data-is-focusable
        css={css`
          width: ${100 / columnCount.current}%;
        `}
      >
        <div className={classNames.listGridExampleSizer}>
          <div className={classNames.listGridExamplePadder}>
            <div>
              <div
                key={index}
                className={`${
                  selected.indexOf(item) >= 0 ? 'selected' : ''
                } flex flex-col items-center border border-gray-300 select-none cursor-pointer rounded-md p-2`}
                css={css`
                  width: 150px;
                  height: 150px;
                  margin: 0 auto;

                  &.selected {
                    border-color: #1765f5;
                    background: #def4ff;
                  }

                  &:hover {
                    border-color: #1765f5;
                    box-shadow: inset 0 0 0 1px #1765f5;
                  }
                `}
                onClick={() => onSelected(item)}
              >
                <div
                  className="flex relative rounded-md select-none justify-center items-center flex-col"
                  css={css`
                    height: 110px;
                    overflow: hidden;
                    width: 100%;
                  `}
                >
                  {['jpg', 'svg', 'jpeg', 'png', 'gif'].indexOf(ext) >= 0 &&
                  meta.fallbackImage.indexOf(item.path) < 0 ? (
                    <>
                      <img
                        className="rounded-md select-none"
                        onError={action(() => {
                          meta.fallbackImage.push(item.path)
                        })}
                        src={`${fixPath(item.path, name, '?w=100&h=90')}`}
                      />
                      <img
                        css={css`
                          pointer-events: none;
                          height: 40px;
                          position: absolute;
                          bottom: -5px;
                          right: -5px;
                        `}
                        src={`/__ext/icons/${ext}.png`}
                      />
                    </>
                  ) : (
                    <>
                      <img
                        css={css`
                          pointer-events: none;
                          height: 70px;
                        `}
                        src={`/__ext/icons/${ext}.png`}
                        className="m-2"
                      />
                      {meta.fallbackImage.indexOf(item.path) >= 0 && (
                        <div
                          className="absolute t-0 l-0 rounded-md flex items-center justify-center bg-red-400"
                          css={css`
                            width: 100%;
                            height: 20px;
                            color: white;
                            font-size: 10px;
                          `}
                        >
                          UNAVAILABLE
                        </div>
                      )}
                    </>
                  )}
                </div>
                <Label
                  className="text-center truncate w-full flex-1 cursor-pointer"
                  css={css`
                    font-size: 12px;
                  `}
                >
                  {name}
                </Label>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }, [])

  return (
    <div>
      <FocusZone>
        <List
          className={classNames.listGridExample}
          items={datas}
          getItemCountForPage={getItemCountForPage}
          getPageHeight={getPageHeight}
          renderedWindowsAhead={4}
          onRenderCell={onRenderCell}
          css={css`
            border-right-width: 1px;
            border-color: rgba(209, 213, 219, 0.3);
            padding-top: 10px;
          `}
        />
      </FocusZone>
    </div>
  )
})
