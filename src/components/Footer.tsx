
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <h3 className="text-lg font-bold text-federation-blue mb-4">Federation</h3>
            <p className="text-gray-600 mb-4">
              A professional social network built on the ActivityPub federation protocol.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-600 hover:text-federation-blue">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-600 hover:text-federation-blue">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-600 hover:text-federation-blue">
                <span className="sr-only">Mastodon</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792.111 12.483.111h-.03c-3.29 0-4.124.131-5.47.198-2.63.396-4.754 2.286-5.22 4.834-.465 2.545-.48 5.595.046 7.839.392 2.07 1.658 3.722 3.268 4.746 1.612 1.018 3.487 1.274 5.25 1.16 3.458-.225 4.468-1.692 4.468-1.692l-.102-2.226s-2.048.657-4.348.577c-2.227-.082-4.603-.222-4.95-2.883-.01-.072-.037-1.203-.037-1.203 0-.001 3.056.744 6.927.925 2.353.11 4.542-.276 6.397-.81 2.017-.581 3.783-2.398 3.997-4.273.367-3.153.337-7.702.337-7.702zm-4.705 7.915c0 1.491-.747 2.394-2.29 2.394-1.666 0-2.503-1.08-2.503-3.17V9.138c0-2.08.837-3.108 2.503-3.108 1.542 0 2.29.947 2.29 2.454v4.743zm-8.573 0c0 1.491-.747 2.394-2.29 2.394-1.666 0-2.503-1.08-2.503-3.17V9.138c0-2.08.837-3.108 2.503-3.108 1.542 0 2.29.947 2.29 2.454v4.743z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="md:col-span-3 grid sm:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">About</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">Our Mission</a></li>
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">Team</a></li>
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">Blog</a></li>
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">Careers</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">Documentation</a></li>
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">Help Center</a></li>
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">API</a></li>
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">How Federation Works</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">Terms of Service</a></li>
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">Code of Conduct</a></li>
                <li><a href="#" className="text-gray-600 hover:text-federation-blue">Instance Guidelines</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            &copy; {new Date().getFullYear()} Federation Network. Open source software under the AGPLv3 license.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
