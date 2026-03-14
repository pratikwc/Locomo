interface BusinessMetrics {
  profileCompleteness: number;
  totalReviews: number;
  averageRating: number;
  reviewResponseRate: number;
  totalPosts: number;
  recentPostsCount: number;
  photoCount: number;
  recentPhotosCount: number;
  monthlyViews: number;
  monthlyActions: number;
}

interface HealthScoreBreakdown {
  overall: number;
  profileScore: number;
  reviewScore: number;
  postScore: number;
  photoScore: number;
  engagementScore: number;
  actionItems: ActionItem[];
}

interface ActionItem {
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: number;
}

export function calculateHealthScore(metrics: BusinessMetrics): HealthScoreBreakdown {
  const profileScore = calculateProfileScore(metrics);
  const reviewScore = calculateReviewScore(metrics);
  const postScore = calculatePostScore(metrics);
  const photoScore = calculatePhotoScore(metrics);
  const engagementScore = calculateEngagementScore(metrics);

  const weights = {
    profile: 0.30,
    review: 0.30,
    engagement: 0.20,
    post: 0.10,
    photo: 0.10,
  };

  const overall = Math.round(
    profileScore * weights.profile +
    reviewScore * weights.review +
    engagementScore * weights.engagement +
    postScore * weights.post +
    photoScore * weights.photo
  );

  const actionItems = generateActionItems(metrics, {
    profileScore,
    reviewScore,
    postScore,
    photoScore,
    engagementScore,
  });

  return {
    overall,
    profileScore,
    reviewScore,
    postScore,
    photoScore,
    engagementScore,
    actionItems,
  };
}

function calculateProfileScore(metrics: BusinessMetrics): number {
  return metrics.profileCompleteness;
}

function calculateReviewScore(metrics: BusinessMetrics): number {
  let score = 0;

  if (metrics.totalReviews === 0) {
    return 0;
  }

  const ratingScore = (metrics.averageRating / 5) * 40;
  score += ratingScore;

  const reviewCountScore = Math.min((metrics.totalReviews / 50) * 30, 30);
  score += reviewCountScore;

  const responseScore = metrics.reviewResponseRate * 30;
  score += responseScore;

  return Math.round(score);
}

function calculatePostScore(metrics: BusinessMetrics): number {
  let score = 0;

  const totalPostsScore = Math.min((metrics.totalPosts / 20) * 40, 40);
  score += totalPostsScore;

  const recentPostsScore = Math.min((metrics.recentPostsCount / 4) * 60, 60);
  score += recentPostsScore;

  return Math.round(score);
}

function calculatePhotoScore(metrics: BusinessMetrics): number {
  let score = 0;

  const totalPhotosScore = Math.min((metrics.photoCount / 20) * 40, 40);
  score += totalPhotosScore;

  const recentPhotosScore = Math.min((metrics.recentPhotosCount / 5) * 60, 60);
  score += recentPhotosScore;

  return Math.round(score);
}

function calculateEngagementScore(metrics: BusinessMetrics): number {
  let score = 0;

  const viewsScore = Math.min((metrics.monthlyViews / 1000) * 50, 50);
  score += viewsScore;

  const actionsScore = Math.min((metrics.monthlyActions / 100) * 50, 50);
  score += actionsScore;

  return Math.round(score);
}

function generateActionItems(
  metrics: BusinessMetrics,
  scores: {
    profileScore: number;
    reviewScore: number;
    postScore: number;
    photoScore: number;
    engagementScore: number;
  }
): ActionItem[] {
  const items: ActionItem[] = [];

  if (scores.profileScore < 70) {
    items.push({
      type: 'profile',
      title: 'Complete Your Business Profile',
      description: `Your profile is ${metrics.profileCompleteness}% complete. Add missing information like business hours, description, and contact details to improve visibility.`,
      priority: 'high',
      impact: 30 - scores.profileScore,
    });
  }

  if (metrics.totalReviews < 10) {
    items.push({
      type: 'reviews',
      title: 'Get More Customer Reviews',
      description: `You have ${metrics.totalReviews} reviews. Encourage satisfied customers to leave reviews to build trust and improve rankings.`,
      priority: 'high',
      impact: 25,
    });
  }

  if (metrics.reviewResponseRate < 0.5) {
    items.push({
      type: 'reviews',
      title: 'Respond to Customer Reviews',
      description: `Only ${Math.round(metrics.reviewResponseRate * 100)}% of your reviews have responses. Reply to reviews to show customers you value their feedback.`,
      priority: 'medium',
      impact: 20,
    });
  }

  if (metrics.averageRating < 4.0 && metrics.totalReviews > 0) {
    items.push({
      type: 'reviews',
      title: 'Improve Customer Satisfaction',
      description: `Your average rating is ${metrics.averageRating.toFixed(1)} stars. Focus on addressing customer concerns and improving service quality.`,
      priority: 'critical',
      impact: 30,
    });
  }

  if (metrics.recentPostsCount === 0) {
    items.push({
      type: 'posts',
      title: 'Start Posting Regular Updates',
      description: 'You haven\'t posted recently. Share updates, offers, or news to keep customers engaged.',
      priority: 'medium',
      impact: 15,
    });
  }

  if (metrics.photoCount < 10) {
    items.push({
      type: 'photos',
      title: 'Add More Business Photos',
      description: `You have ${metrics.photoCount} photos. Add high-quality images of your business, products, and services to attract more customers.`,
      priority: 'medium',
      impact: 15,
    });
  }

  if (metrics.recentPhotosCount === 0 && metrics.photoCount > 0) {
    items.push({
      type: 'photos',
      title: 'Upload Recent Photos',
      description: 'Keep your profile fresh by adding new photos regularly.',
      priority: 'low',
      impact: 10,
    });
  }

  if (metrics.monthlyViews < 100) {
    items.push({
      type: 'engagement',
      title: 'Increase Business Visibility',
      description: 'Your profile views are low. Optimize your business information and encourage customer engagement.',
      priority: 'high',
      impact: 20,
    });
  }

  items.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.impact - a.impact;
  });

  return items;
}

export async function calculateAndStoreHealthScore(
  businessId: string,
  metrics: BusinessMetrics
): Promise<HealthScoreBreakdown> {
  const healthScore = calculateHealthScore(metrics);

  return healthScore;
}
