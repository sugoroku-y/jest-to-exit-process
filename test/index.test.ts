import assert from 'assert';
import '../src';

const EXIT_MAP = {
  // process.exitを呼ばない
  'does not exit': null,
  // process.exitを終了コード無しで呼ぶ
  'exit without code': [],
  // process.exitを終了コード0で呼ぶ
  'exit with code: 0': [0],
  // process.exitを終了コード-1で呼ぶ
  'exit with code:-1': [-1],
} as const;

const EXPECTED_MAP = {
  // toExitProcessへ終了コードの指定なし
  'without code': [],
  // toExitProcessへ終了コード0を指定
  'with code: 0': [0],
  // toExitProcessへ終了コード-1を指定
  'with code:-1': [-1],
} as const;

const PASS_OR_FAIL: Record<
  keyof typeof EXIT_MAP,
  Record<keyof typeof EXPECTED_MAP, 'pass' | 'fail'>
> = {
  // process.exitが呼ばれなかったら失敗
  'does not exit': {
    'without code': 'fail',
    'with code: 0': 'fail',
    'with code:-1': 'fail',
  },
  // process.exitが終了コード無しで呼ばれたら、0を指定して呼ばれたときと同じ
  'exit without code': {
    'without code': 'pass',
    'with code: 0': 'pass',
    'with code:-1': 'fail',
  },
  // process.exitが終了コード0で呼ばれたら、
  'exit with code: 0': {
    // toExitProcessに終了コードが指定されていなければ成功
    'without code': 'pass',
    // toExitProcessに指定された終了コードと一致すれば成功
    'with code: 0': 'pass',
    // toExitProcessに指定された終了コードと一致しなければ失敗
    'with code:-1': 'fail',
  },
  // process.exitが終了コード-1で呼ばれたら、
  'exit with code:-1': {
    // toExitProcessに終了コードが指定されていなければ成功
    'without code': 'pass',
    // toExitProcessに指定された終了コードと一致しなければ失敗
    'with code: 0': 'fail',
    // toExitProcessに指定された終了コードと一致すれば成功
    'with code:-1': 'pass',
  },
} as const;

// eslint-disable-next-line no-control-regex
const ESCAPE_SEQUENCE = /(?:\x1b\[\d+m)*/;

describe('.toExitProcess', () => {
  describe.each`
    exit
    ${'does not exit'}
    ${'exit without code'}
    ${'exit with code: 0'}
    ${'exit with code:-1'}
  `('process $exit', ({ exit }: { exit: keyof typeof EXIT_MAP }) => {
    describe.each`
      expected
      ${'without code'}
      ${'with code: 0'}
      ${'with code:-1'}
    `(
      'expected to exit $expected',
      ({ expected }: { expected: keyof typeof EXPECTED_MAP }) => {
        const exitParam = EXIT_MAP[exit];
        const toExitProcessParam = EXPECTED_MAP[expected];
        const testProc = exitParam
          ? () => {
              process.exit(...exitParam);
            }
          : () => undefined;
        const testProcAsync = async () => {
          await new Promise(r => setTimeout(r, 1));
          testProc();
        };
        switch (PASS_OR_FAIL[exit][expected]) {
          // .notが付かなければ成功となる組み合わせ
          case 'pass':
            {
              test('without .not: pass', () => {
                expect(() => {
                  testProc();
                }).toExitProcess(...toExitProcessParam);
              });
              // 非同期
              test('without .not async: pass', async () => {
                await expect(async () => {
                  await testProcAsync();
                }).toExitProcess(...toExitProcessParam);
              });
              assert(exitParam, 'exitParamがnullのパターンにpassはない');
              const pattern = toExitProcessParam.length
                ? regexp`^
                  ${ESCAPE_SEQUENCE}expect\(${ESCAPE_SEQUENCE}received${ESCAPE_SEQUENCE}\)\.${ESCAPE_SEQUENCE}not${ESCAPE_SEQUENCE}\.${ESCAPE_SEQUENCE}toExitProcess${ESCAPE_SEQUENCE}\(${ESCAPE_SEQUENCE}expected${ESCAPE_SEQUENCE}\)${ESCAPE_SEQUENCE}\
                  \
                  Expected exit code: not ${ESCAPE_SEQUENCE}${
                    toExitProcessParam[0]
                  }${ESCAPE_SEQUENCE}\
                  Received exit code: +${ESCAPE_SEQUENCE}${
                    exitParam[0] ?? 0
                  }${ESCAPE_SEQUENCE}
                  $`
                : regexp`^
                  ${ESCAPE_SEQUENCE}expect\(${ESCAPE_SEQUENCE}received${ESCAPE_SEQUENCE}\)\.${ESCAPE_SEQUENCE}not${ESCAPE_SEQUENCE}\.${ESCAPE_SEQUENCE}toExitProcess${ESCAPE_SEQUENCE}\(${ESCAPE_SEQUENCE}\)${ESCAPE_SEQUENCE}\
                  \
                  Exit code: ${ESCAPE_SEQUENCE}${
                    exitParam[0] ?? 0
                  }${ESCAPE_SEQUENCE}
                  $`;
              // .notが付いていれば失敗
              test('with .not: fail', () => {
                expect(() => {
                  expect(() => {
                    testProc();
                  }).not.toExitProcess(...toExitProcessParam);
                }).toThrow(pattern);
              });
              // 非同期
              test('with .not async: fail', async () => {
                await expect(async () => {
                  await expect(async () => {
                    await testProcAsync();
                  }).not.toExitProcess(...toExitProcessParam);
                }).rejects.toThrow(pattern);
              });
            }
            break;
          // .notが付かなければ失敗となる組み合わせ
          case 'fail':
            {
              const pattern = !exitParam
                ? regexp`^
                  ${ESCAPE_SEQUENCE}expect\(${ESCAPE_SEQUENCE}received${ESCAPE_SEQUENCE}\)\.${ESCAPE_SEQUENCE}toExitProcess${ESCAPE_SEQUENCE}\(${ESCAPE_SEQUENCE}${
                    toExitProcessParam.length
                      ? regexp`expected${ESCAPE_SEQUENCE}`
                      : ''
                  }\)${ESCAPE_SEQUENCE}\
                  \
                  Received function did not exit process
                  $`
                : regexp`^
                  ${ESCAPE_SEQUENCE}expect\(${ESCAPE_SEQUENCE}received${ESCAPE_SEQUENCE}\)\.${ESCAPE_SEQUENCE}toExitProcess${ESCAPE_SEQUENCE}\(${ESCAPE_SEQUENCE}expected${ESCAPE_SEQUENCE}\)${ESCAPE_SEQUENCE}\
                  \
                  Expected exit code: +${ESCAPE_SEQUENCE}${
                    // exitParamがnullでなくてtoExitProcessParamが空のパターンに'fail'はない
                    toExitProcessParam[0] ?? 0
                  }${ESCAPE_SEQUENCE}\
                  Received exit code: +${ESCAPE_SEQUENCE}${
                    exitParam[0] ?? 0
                  }${ESCAPE_SEQUENCE}
                  $`;
              test('without .not: fail', () => {
                expect(() => {
                  expect(() => {
                    testProc();
                  }).toExitProcess(...toExitProcessParam);
                }).toThrow(pattern);
              });
              // 非同期
              test('without .not async: fail', async () => {
                await expect(async () => {
                  await expect(async () => {
                    await testProcAsync();
                  }).toExitProcess(...toExitProcessParam);
                }).rejects.toThrow(pattern);
              });
              // .notが付いていれば成功
              test('with .not: pass', () => {
                expect(() => {
                  testProc();
                }).not.toExitProcess(...toExitProcessParam);
              });
              // 非同期
              test('with .not async: pass', async () => {
                await expect(async () => {
                  await testProcAsync();
                }).not.toExitProcess(...toExitProcessParam);
              });
            }
            break;
        }
      },
    );
  });

  // プロセス終了前に例外が出た場合は失敗と見なす
  describe('exception thrown', () => {
    class TestException extends Error {}
    class AsyncTestException extends Error {}
    // 同期
    const testProc = (): void => {
      throw new TestException();
    };
    // 非同期
    const testProcAsync = async (): Promise<void> => {
      await new Promise(r => setTimeout(r, 1));
      throw new AsyncTestException();
    };
    test('without .not: fail', () => {
      expect(() => {
        expect(testProc).toExitProcess();
      }).toThrow(TestException);
    });
    test('without .not async: fail', async () => {
      await expect(async () => {
        await expect(testProcAsync).toExitProcess();
      }).rejects.toThrow(AsyncTestException);
    });
    // .notが付いてても例外の対応は同じ
    test('with .not: fail', () => {
      expect(() => {
        expect(testProc).not.toExitProcess();
      }).toThrow(TestException);
    });
    test('with .not async: fail', async () => {
      await expect(async () => {
        await expect(testProcAsync).not.toExitProcess();
      }).rejects.toThrow(AsyncTestException);
    });
  });
});

function regexp(
  template: TemplateStringsArray,
  ...values: (RegExp | number | string | { flags: string })[]
): RegExp {
  let flags = '';
  const pattern = template.raw
    .map(s =>
      s.replace(/(\\(?:.|\n)|(?<!\s) (?!\s))|\/\/.*|\/\*.*?\*\/|\s+/g, '$1'),
    )
    .reduce((r, e, i) => {
      const value = values[i - 1];
      if (
        typeof value === 'object' &&
        'flags' in value &&
        typeof value.flags === 'string'
      ) {
        for (const flag of flags) {
          if (!flags.includes(flag)) {
            flags += flag;
          }
        }
      }
      const p =
        value instanceof RegExp
          ? value.source
          : typeof value === 'number'
          ? String(value)
          : typeof value === 'string'
          ? value.replace(/[.^$|()[\]{}+*?]/g, '\\$&')
          : '';
      return r.concat(p, e);
    });
  return new RegExp(pattern, flags);
}
