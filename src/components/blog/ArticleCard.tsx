import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar } from 'lucide-react';
import type { Article } from '../../types/blog';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  return (
    <div 
      className={`bg-white rounded-xl shadow-sm overflow-hidden transition-transform duration-300 hover:-translate-y-1 ${
        featured ? 'lg:col-span-2 md:flex' : ''
      }`}
    >
      <div className={`relative ${featured ? 'md:w-2/5' : ''}`}>
        <img
          src={article.vectorImage}
          alt=""
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 text-sm font-medium bg-blue-600 text-white rounded-full">
            {article.category}
          </span>
        </div>
      </div>
      
      <div className={`p-6 ${featured ? 'md:w-3/5' : ''}`}>
        <div className="flex items-center mb-4">
          <img
            src={article.author.avatar}
            alt={article.author.name}
            className="w-10 h-10 rounded-full"
          />
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{article.author.name}</p>
            <p className="text-sm text-gray-500">{article.author.role}</p>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          <Link to={`/blog/${article.slug}`} className="hover:text-blue-600">
            {article.title}
          </Link>
        </h3>

        <p className="text-gray-600 mb-4 line-clamp-2">
          {article.description}
        </p>

        <div className="flex items-center text-sm text-gray-500">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(article.publishedAt).toLocaleDateString('en-GB')}
          </div>
          <div className="flex items-center ml-4">
            <Clock className="w-4 h-4 mr-1" />
            {article.readingTime}
          </div>
        </div>
      </div>
    </div>
  );
}