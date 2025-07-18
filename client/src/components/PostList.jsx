import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { postService, categoryService } from '../services/api';

export default function PostList() {
  console.log("PostList rendered");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(5);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    categoryService.getAllCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    postService.getAllPosts({ page, limit, search, category: selectedCategory })
      .then(data => {
        setPosts(data.posts || []);
        setPages(data.pages || 1);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, limit, search, selectedCategory]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    const prevPosts = posts;
    setPosts(posts.filter(post => post._id !== id));
    try {
      await postService.deletePost(id);
      setSuccess("Post deleted successfully.");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setPosts(prevPosts);
      alert("Failed to delete post: " + err.message);
    }
  };

  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">All Posts</h2>
      {/* Search and Filter Controls */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search posts..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border px-2 py-1 rounded"
        />
        <select
          value={selectedCategory}
          onChange={e => { setSelectedCategory(e.target.value); setPage(1); }}
          className="border px-2 py-1 rounded"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>
      </div>
      {success && <div className="text-green-600 mb-2">{success}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-gray-500">No posts found.</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post._id} className="hover:shadow-lg transition">
              {post.featuredImage && (
                <img
                  src={`http://localhost:5000${post.featuredImage}`}
                  alt={post.title}
                  className="w-full h-48 object-cover rounded-t"
                  style={{ maxHeight: 200 }}
                />
              )}
              <CardHeader>
                <CardTitle>
                  <Link to={`/posts/${post._id}`} className="hover:underline text-primary">
                    {post.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{post.excerpt || post.content.slice(0, 100) + "..."}</p>
                <div className="text-xs text-gray-500 mt-2">
                  Category: {post.category?.name || "Uncategorized"}
                </div>
                <button
                  onClick={() => handleDelete(post._id)}
                  className="text-red-500 mt-2"
                >
                  Delete
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Pagination Controls */}
      <div className="flex justify-center mt-4 space-x-2">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
        >
          Prev
        </button>
        <span>Page {page} of {pages}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= pages}
          className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}