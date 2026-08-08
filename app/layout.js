import NavBar from '../components/NavBar';
import './globals.css';

const metadata = {
  title: 'BetterKdul',
  description: 'Community-verified results for the Kildare Development Underage League',
};

function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div id="shell">
          <header className="top">
            <div className="masthead">
              <a href="/" className="name">
                Better<em>Kdul</em>
              </a>
              <div className="edition">
                KILDARE DEV.
                <br />
                UNDERAGE LEAGUE
              </div>
            </div>
            <div className="dateline">
              <span>Community verified results</span>
            </div>
          </header>
          <main>{children}</main>
          <NavBar />
        </div>
      </body>
    </html>
  );
}

export default RootLayout;
export { metadata };
