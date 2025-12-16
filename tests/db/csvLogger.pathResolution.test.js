import path from 'path'

describe('csvLogger path resolution', () => {
  const previousEnv = {
    CSV_LOG_DIR: process.env.CSV_LOG_DIR,
    CSV_LOG_FILE: process.env.CSV_LOG_FILE,
  }

  afterEach(() => {
    process.env.CSV_LOG_DIR = previousEnv.CSV_LOG_DIR
    process.env.CSV_LOG_FILE = previousEnv.CSV_LOG_FILE
  })

  test('defaults to user_logs/user_actions.csv when no env is set', async () => {
    delete process.env.CSV_LOG_DIR
    delete process.env.CSV_LOG_FILE
    jest.resetModules()

    const { getAggregatedCSVFilePath } = await import('@/utils/csvLogger')
    expect(getAggregatedCSVFilePath()).toBe(path.join(process.cwd(), 'user_logs', 'user_actions.csv'))
  })

  test('uses CSV_LOG_DIR when provided', async () => {
    const dir = path.join(process.cwd(), 'temp', 'csv-dir-test')
    process.env.CSV_LOG_DIR = `  ${dir}  `
    delete process.env.CSV_LOG_FILE
    jest.resetModules()

    const { getAggregatedCSVFilePath } = await import('@/utils/csvLogger')
    expect(getAggregatedCSVFilePath()).toBe(path.join(path.resolve(dir), 'user_actions.csv'))
  })

  test('uses CSV_LOG_FILE when provided (overrides CSV_LOG_DIR)', async () => {
    const dir = path.join(process.cwd(), 'temp', 'csv-dir-test')
    const file = path.join(process.cwd(), 'temp', 'csv-file-test', 'custom.csv')
    process.env.CSV_LOG_DIR = dir
    process.env.CSV_LOG_FILE = ` ${file} `
    jest.resetModules()

    const { getAggregatedCSVFilePath } = await import('@/utils/csvLogger')
    expect(getAggregatedCSVFilePath()).toBe(path.resolve(file))
  })
})

