import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { postService, categoryService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function PostForm({ editMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState({ title: '', content: '', category: '', featuredImage: '' });
  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    categoryService.getAllCategories().then(setCategories);
    if (editMode && id) {
      postService.getPost(id).then(setPost);
    }
  }, [editMode, id]);

  const handleChange = e => setPost({ ...post, [e.target.name]: e.target.value });

  const handleCategoryChange = value => setPost({ ...post, category: value });

  const handleImageChange = e => setImageFile(e.target.files[0]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!post.title || !post.content || !post.category) {
      setError("All fields are required.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      let featuredImage = post.featuredImage || "";

      // 1. Upload image if selected
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);

        const res = await fetch("/api/posts/upload", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.filePath) {
          featuredImage = data.filePath;
        } else {
          setError(data.message || data.error || "Image upload failed");
          setLoading(false);
          return;
        }
      }

      // 2. Submit the post with the image path
      const postData = { ...post, featuredImage };
      delete postData.author; // Don't send author field

      if (editMode) {
        await postService.updatePost(id, postData);
        setSuccess("Post updated successfully!");
        setTimeout(() => navigate('/'), 1000);
      } else {
        await postService.createPost(postData);
        setSuccess("Post created successfully!");
        setPost({ title: '', content: '', category: '', featuredImage: '' });
        setImageFile(null);
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editMode ? 'Edit' : 'Create'} Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500">{error}</div>}
          {success && <div className="text-green-600">{success}</div>}
          <Input
            name="title"
            value={post.title}
            onChange={handleChange}
            placeholder="Title"
            required
          />
          <Textarea
            name="content"
            value={post.content}
            onChange={handleChange}
            placeholder="Content"
            required
          />
          <Select value={post.category} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Image upload input */}
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          {/* Show image preview if available */}
          {post.featuredImage && (
            <img src={post.featuredImage} alt="Featured" className="w-full max-h-64 object-cover my-2" />
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : editMode ? 'Update' : 'Create'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}