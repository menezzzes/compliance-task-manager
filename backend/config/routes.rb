Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :tasks, only: [ :index, :show, :create, :update, :destroy ] do
        get :events, on: :member
      end
    end
  end
end
