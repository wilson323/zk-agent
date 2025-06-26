/**
 * @file navigation.js
 * @description Mock for Next.js navigation in Jest tests
 * @author Jest Fix Team
 */

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();
const mockBack = jest.fn();
const mockForward = jest.fn();
const mockRefresh = jest.fn();

const mockUseRouter = () => ({
  push: mockPush,
  replace: mockReplace,
  prefetch: mockPrefetch,
  back: mockBack,
  forward: mockForward,
  refresh: mockRefresh,
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
});

const mockUsePathname = jest.fn(() => '/');
const mockUseSearchParams = jest.fn(() => new URLSearchParams());
const mockUseParams = jest.fn(() => ({}));

const mockRedirect = jest.fn();
const mockNotFound = jest.fn();

module.exports = {
  useRouter: mockUseRouter,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
  useParams: mockUseParams,
  redirect: mockRedirect,
  notFound: mockNotFound,
  // Export individual mocks for testing
  __mocks: {
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
    back: mockBack,
    forward: mockForward,
    refresh: mockRefresh,
    redirect: mockRedirect,
    notFound: mockNotFound,
  },
};