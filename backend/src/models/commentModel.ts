import mongoose, { InferSchemaType } from "mongoose";

const commentSchema = new mongoose.Schema({
  // The fund this comment is associated with
  fundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund',
    required: true,
    index: true
  },
  
  // The user who created the comment
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // The comment text
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // If this is a reply, reference to the parent comment
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  
  // Users who liked this comment
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Comment status (active, deleted, flagged)
  status: {
    type: String,
    enum: ['active', 'deleted', 'flagged'],
    default: 'active'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for efficient querying
commentSchema.index({ fundId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });

// Update the updatedAt timestamp before saving
commentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export type IComment = InferSchemaType<typeof commentSchema>;
const Comment = mongoose.model("Comment", commentSchema);

export default Comment; 