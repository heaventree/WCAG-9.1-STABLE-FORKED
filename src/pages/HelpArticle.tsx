import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, ThumbsDown, Book, AlertTriangle, Share2, Clock, Eye, Calendar } from 'lucide-react';
import { marked } from 'marked';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';
import { BackToTop } from '../components/BackToTop';
import { useHelpArticle } from '../hooks/useHelpArticle';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { useEffect } from 'react';

export function HelpArticle() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { article, loading, error, voteHelpful } = useHelpArticle(slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-[130px] pb-[130px] flex items-center justify-center">
        <LoadingSpinner size="large" className="text-blue-600" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50 pt-[130px] pb-[130px]">
        <div className="max-w-3xl mx-auto px-4">
          <EmptyState
            title="Article Not Found"
            description={error || "The article you're looking for doesn't exist."}
            icon={<Book className="h-6 w-6 text-gray-600" />}
            action={{
              label: "Back to Help Center",
              onClick: () => window.location.href = '/help'
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 pt-[130px] pb-[130px]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/help"
            className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 bg-white rounded-lg shadow-sm border border-gray-200 mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Help Center
          </Link>

          <article className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-100">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">
                {article.title}
              </h1>
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(article.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  {article.views} views
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {Math.ceil(article.content.length / 1000)} min read
                </div>
              </div>
            </div>
              
            <div className="p-8">
              <div 
                className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-gray-900 prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md"
                dangerouslySetInnerHTML={{ 
                  __html: marked(article.content)
                }}
              />
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Was this article helpful?
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <button 
                  onClick={() => voteHelpful(true)}
                  className="inline-flex items-center px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Yes
                </button>
                <button
                  onClick={() => voteHelpful(false)}
                  className="inline-flex items-center px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  No
                </button>
                <div className="text-sm text-gray-500 flex items-center">
                  <ThumbsUp className="w-4 h-4 mr-2 text-green-500" />
                  {article.helpful_votes} found this helpful
                </div>
                <button
                  onClick={() => navigator.share({ 
                    title: article.title,
                    url: window.location.href
                  })}
                  className="ml-auto inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Article
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
      <Footer />
      <BackToTop />
    </>
  );
}