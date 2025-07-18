import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { postService } from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function PostView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');

  const { user } = useContext(AuthContext) || {};

  useEffect(() => {
    postService.getPost(id).then(setPost);
    fetchComments();
  }, [id]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const data = await postService.getComments(id);
      setComments(data.comments || []);
    } catch (err) {
      setCommentError('Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    setCommentError('');
    setCommentSuccess('');
    try {
      await postService.addComment(id, { content: newComment });
      setNewComment('');
      setCommentSuccess('Comment added!');
      fetchComments();
    } catch (err) {
      setCommentError('Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await postService.deleteComment(id, commentId);
      fetchComments();
    } catch (err) {
      setCommentError('Failed to delete comment');
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      await postService.deletePost(id);
      navigate("/");
    }
  };

  if (!post) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{post.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 text-gray-500 text-sm">
          Category: {post.category?.name || "Uncategorized"}
        </div>
        <div className="mb-4">{post.content}</div>
        <div className="flex gap-2 mb-4">
          <Button asChild>
            <Link to={`/edit/${post._id}`}>Edit</Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>

        <hr className="my-4" />
        <h3 className="text-lg font-semibold mb-2">Comments</h3>
        {loadingComments ? (
          <div>Loading comments...</div>
        ) : (
          <div className="space-y-2 mb-4">
            {comments.length === 0 ? (
              <div className="text-gray-500">No comments yet.</div>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="border rounded p-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{comment.author?.username || 'User'}</div>
                    <div>{comment.content}</div>
                  </div>
                  {user && comment.author?._id === user._id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteComment(comment._id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {user ? (
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="border px-2 py-1 rounded flex-1"
              required
            />
            <Button type="submit" disabled={!newComment.trim()}>Post</Button>
          </form>
        ) : (
          <div className="text-gray-500">Log in to comment.</div>
        )}
        {commentError && <div className="text-red-500 mt-2">{commentError}</div>}
        {commentSuccess && <div className="text-green-600 mt-2">{commentSuccess}</div>}
      </CardContent>
    </Card>
  );
}