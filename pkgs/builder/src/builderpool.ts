import { Builder, IBuilderArgs } from './builder'
import { Runner } from './runner'
import { Watcher } from './watcher'

export class BuilderPool {
  public running: Record<string, Runner> = {}
  public builders: Record<string, Builder> = {}
  public watchers: Record<string, Watcher> = {}
  private _onParentMessage = async (_: any) => {}

  status(name: string): false | 'building' | 'idle' | 'running' {
    if (!this.builders[name]) return false

    if (this.builders[name].status === 'building') {
      return 'building'
    }

    return this.running[name] ? 'running' : 'idle'
  }

  async add(name: string, args: IBuilderArgs) {
    if (name === 'main')
      throw new Error(
        `Failed to add new builder. Builder name cannot be "main".`
      )

    let shouldRun = false
    if (this.running[name]) {
      await this.running[name].kill()
      delete this.running[name]
      shouldRun = true
    }

    // adding existing builder will rebuild it.
    // do not start build when it's still building
    if (
      !this.builders[name] ||
      (this.builders[name] && this.builders[name].status === 'done')
    ) {
      this.builders[name] = new Builder({ ...args, name })
      await this.builders[name].build()
    }

    if (args.watch && args.onChange && !this.watchers[name]) {
      if (this.watchers[name]) {
        await this.watchers[name].stop()
      }
      this.watchers[name] = new Watcher(args.watch, args.onChange)
    }

    if (shouldRun) {
      this.run(name)
    }
  }

  async rebuild(name: string, buildInfo?: any) {
    if (this.status(name) !== 'building') {
      let shouldRun = false
      let startArgs = undefined

      if (this.running[name]) {
        startArgs = this.running[name].startArgs
        await this.running[name].kill()
        // delete this.running[name]
        shouldRun = true
      }

      let freshRebuild = true
      if (this.builders[name]) {
        if (this.builders[name].platform === 'browser') {
          const result = await (await this.builders[name].process).rebuild()
          await this.builders[name].onBuilt(result, buildInfo)
          freshRebuild = false
        }
      }

      if (freshRebuild) {
        const args = this.builders[name] ? this.builders[name]._args : {}

        this.builders[name] = new Builder({
          ...args,
          name,
        })
        await this.builders[name].build(buildInfo)

        if (args.watch && args.onChange) {
          if (this.watchers[name]) {
            await this.watchers[name].stop()
          }
          this.watchers[name] = new Watcher(args.watch, args.onChange)
        }
      }

      if (shouldRun) {
        this.run(name, startArgs)
      }
    }
  }

  async send(name: string, data: any): Promise<false | any> {
    if (name === 'main') {
      return await this._onParentMessage(data)
    } else {
      const run = this.running[name]
      if (run) {
        return await run.send(data)
      }
      return false
    }
  }

  onParentMessage(func: (msg: any) => Promise<any>) {
    this._onParentMessage = func
  }

  run(name: string, args?: any): Runner {
    const builder = this.builders[name]
    if (builder) {
      const runner = new Runner(name, builder.out, this, args)

      this.running[name] = runner
      return runner
    }
    throw new Error(`Failed to run. builder ${name} does not exists.`)
  }
}
