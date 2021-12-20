import '../src';

const EXIT_MAP = {
  'does not exit': null,
  'exit without code': [],
  'exit with code: 0': [0],
  'exit with code:-1': [-1],
} as const;

const EXPECTED_MAP = {
  'without code': [],
  'with code: 0': [0],
  'with code:-1': [-1],
} as const;

describe('.toExitProcess', () => {
  test.each`
    exit                   | expected          | pass
    ${'does not exit'}     | ${'without code'} | ${false}
    ${'does not exit'}     | ${'with code: 0'} | ${false}
    ${'does not exit'}     | ${'with code:-1'} | ${false}
    ${'exit without code'} | ${'without code'} | ${true}
    ${'exit without code'} | ${'with code: 0'} | ${true}
    ${'exit without code'} | ${'with code:-1'} | ${false}
    ${'exit with code: 0'} | ${'without code'} | ${true}
    ${'exit with code: 0'} | ${'with code: 0'} | ${true}
    ${'exit with code: 0'} | ${'with code:-1'} | ${false}
    ${'exit with code:-1'} | ${'without code'} | ${true}
    ${'exit with code:-1'} | ${'with code: 0'} | ${false}
    ${'exit with code:-1'} | ${'with code:-1'} | ${true}
  `(
    'process $exit, expected to exit $expected: $pass',
    async ({
      exit,
      expected,
      pass,
    }: {
      exit: keyof typeof EXIT_MAP;
      expected: keyof typeof EXPECTED_MAP;
      pass: boolean;
    }) => {
      const exitParam = EXIT_MAP[exit];
      const toExitProcessParam = EXPECTED_MAP[expected];
      const testProc = () => {
        exitParam && process.exit(...exitParam);
      };
      const testProcAsync = async () => {
        await new Promise(r => setTimeout(r, 1));
        testProc();
      };
      if (pass) {
        // .notが付かなければ成功となる組み合わせ
        expect(() => {
          testProc();
        }).toExitProcess(...toExitProcessParam);
        // 非同期
        await expect(async () => {
          await testProcAsync();
        }).toExitProcess(...toExitProcessParam);
        // .notが付いてるのは失敗となる
        const snapshot = `"Received function exit process${
          toExitProcessParam.length
            ? ` with ${toExitProcessParam[0]}`
            : ', but not expected.'
        }"`;
        expect(() => {
          expect(() => {
            testProc();
          }).not.toExitProcess(...toExitProcessParam);
        }).toThrowErrorMatchingInlineSnapshot(snapshot);
        // 非同期
        await expect(async () => {
          await expect(async () => {
            await testProcAsync();
          }).not.toExitProcess(...toExitProcessParam);
        }).rejects.toThrowErrorMatchingInlineSnapshot(snapshot);
      } else {
        // .notが付かなければ失敗となる組み合わせ
        const snapshot = !exitParam
          ? `"Received function did not exit process."`
          : !toExitProcessParam.length
          ? `"Received function exit process, but not expected."`
          : `
"Excepted process exit code: ${toExitProcessParam[0]}
Received process exit code: ${exitParam[0] ?? 0}"
`;
        expect(() => {
          expect(() => {
            testProc();
          }).toExitProcess(...toExitProcessParam);
        }).toThrowErrorMatchingInlineSnapshot(snapshot);
        // 非同期
        await expect(async () => {
          await expect(async () => {
            await testProcAsync();
          }).toExitProcess(...toExitProcessParam);
        }).rejects.toThrowErrorMatchingInlineSnapshot(snapshot);
        // .notが付いてるので成功
        expect(() => {
          testProc();
        }).not.toExitProcess(...toExitProcessParam);
        // 非同期
        await expect(async () => {
          await testProcAsync();
        }).not.toExitProcess(...toExitProcessParam);
      }
    },
  );

  // プロセス終了前に例外が出た場合は失敗と見なす
  test('exception in .toExitProcess', async () => {
    // 同期
    const testProc = (): void => {
      throw new Error('normal');
    };
    // 非同期
    const testProcAsync = async (): Promise<void> => {
      await new Promise(r => setTimeout(r, 1));
      throw new Error('async');
    };
    expect(() => {
      expect(testProc).toExitProcess();
    }).toThrowErrorMatchingInlineSnapshot(`"normal"`);
    await expect(async () => {
      await expect(testProcAsync).toExitProcess();
    }).rejects.toThrowErrorMatchingInlineSnapshot(`"async"`);
    // .notが付いてても例外の対応は同じ
    expect(() => {
      expect(testProc).not.toExitProcess();
    }).toThrowErrorMatchingInlineSnapshot(`"normal"`);
    await expect(async () => {
      await expect(testProcAsync).not.toExitProcess();
    }).rejects.toThrowErrorMatchingInlineSnapshot(`"async"`);
  });
});
