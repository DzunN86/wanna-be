import chokidar from 'chokidar'
import { Stats } from 'fs'

export type TFsEventName = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'

export class Watcher {
  dirs: string[]
  private watcher: any
  private _lastChangedFile: { filename?: string; timestamp?: number } = {}

  constructor(
    dirs: string[],
    onChange: (event: string, path: string) => Promise<void>
  ) {
    this.dirs = dirs
    this.watcher = chokidar
      .watch(this.dirs, {
        ignoreInitial: true,
      })
      .on('all', (eventName: TFsEventName, filepath: string, stats: Stats) => {
        /**
         * Bugfix for fs.watch often triggering events twice.
         * Ref:
         * https://stackoverflow.com/questions/12978924/fs-watch-fired-twice-when-i-change-the-watched-file
         * https://github.com/paulmillr/chokidar/issues/610
         */
        if (filepath === this._lastChangedFile.filename) {
          const now = Date.now()
          if (
            !this._lastChangedFile.timestamp ||
            now - this._lastChangedFile.timestamp < 300
          ) {
            return
          }
        }

        this._lastChangedFile.filename = filepath
        this._lastChangedFile.timestamp = Date.now()

        onChange(eventName, filepath)
      })
  }

  async stop() {
    await this.watcher.close()
  }
}
