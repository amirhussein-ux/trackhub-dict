export type MongoEntity<T> = T & {
  _id?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};
