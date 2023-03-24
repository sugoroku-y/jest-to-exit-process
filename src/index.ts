class ProcessExitException {}

class ProcessExitContext {
  private readonly process_exit = jest
    .spyOn(process, 'exit')
    .mockImplementation(() => {
      throw new ProcessExitException();
    });

  private checked = false;

  constructor(
    private readonly context: jest.MatcherContext,
    private readonly code?: number,
  ) {}

  check(state?: { ex: unknown }): jest.CustomMatcherResult {
    this.checked = true;
    const { isNot, promise, utils } = this.context;
    const code = this.code;
    const message = (...messages: string[]): string =>
      [
        utils.matcherHint(
          'toExitProcess',
          undefined,
          code === undefined ? '' : undefined,
          {
            ...(isNot && { isNot }),
            ...(promise && { promise }),
          },
        ),
        '',
        ...messages,
      ].join('\n');
    // 最初のprocess.exit呼び出し
    const [call] = this.process_exit.mock.calls;
    if (!call) {
      // process.exitが1度も呼ばれなかった
      if (state) {
        // process.exitが呼ばれる前に例外が投げられた -> 例外をそのまま投げなおす
        throw state.ex;
      }
      // process.exitが1度も呼ばれない場合
      return {
        pass: false,
        message: () => message('Received function did not exit process'),
      };
    }
    // 指定された終了コードを取得
    const actual = call[0] ?? 0;
    if (this.code === undefined) {
      // 期待する終了コードが指定されていなければ、終了コードが何であっても成功
      return {
        pass: true,
        message: () =>
          message(`Exit code: ${utils.RECEIVED_COLOR(`${actual}`)}`),
      };
    }
    // 期待する終了コードが指定されていれば、実際の終了コードと比較
    return {
      pass: actual === this.code,
      message: () =>
        message(
          `Expected exit code:${isNot ? ' not' : ''} ${utils.EXPECTED_COLOR(
            `${code}`,
          )}`,
          `Received exit code:${isNot ? '    ' : ''} ${utils.RECEIVED_COLOR(
            `${actual}`,
          )}`,
        ),
    };
  }

  dispose() {
    if (this.checked) {
      this.process_exit.mockRestore();
    }
  }
}

function toExitProcess(
  this: jest.MatcherContext,
  received: () => unknown,
  code?: number,
): jest.CustomMatcherResult | Promise<jest.CustomMatcherResult> {
  const context = new ProcessExitContext(this, code);
  try {
    const result = received();
    if (result instanceof Promise) {
      return (async () => {
        try {
          await result;
          return context.check();
        } catch (ex: unknown) {
          return context.check({ ex });
        } finally {
          context.dispose();
        }
      })();
    }
    return context.check(undefined);
  } catch (ex) {
    return context.check({ ex });
  } finally {
    context.dispose();
  }
}
expect.extend({ toExitProcess });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T> {
      toExitProcess(
        ...args: T extends () => unknown
          ? [code?: number]
          : [] & 'expectには関数を指定してください。'
      ): T extends (...args: unknown[]) => infer TR
        ? TR extends Promise<unknown>
          ? Promise<R>
          : R
        : never;
    }
  }
}

export {};
