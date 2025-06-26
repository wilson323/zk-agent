/**
 * @file router.js
 * @description Mock for Next.js router in Jest tests
 * @author Jest Fix Team
 */

const mockRouter = {
  push: jest.fn(() => Promise.resolve(true)),
  replace: jest.fn(() => Promise.resolve(true)),
  prefetch: jest.fn(() => Promise.resolve()),
  back: jest.fn(),
  reload: jest.fn(),
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  basePath: '',
  isLocaleDomain: false,
  isReady: true,
  isPreview: false,
  isFallback: false,
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  beforePopState: jest.fn(),
};

module.exports = {
  useRouter: () => mockRouter,
  withRouter: (Component) => Component,
  Router: mockRouter,
  default: mockRouter,
};