import Bottleneck from 'bottleneck';

export const limiter = new Bottleneck({
  maxConcurrent: 2, // Number of concurrent promises
  minTime: 0, // Minimum time (in ms) between the start of subsequent promises
});
