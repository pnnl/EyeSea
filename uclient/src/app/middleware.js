import { getServicePath } from './module';

export default store => next => action => {
  if (action.servicePath) {
    action.servicePath = getServicePath(store.getState());
  }
  next(action);
};
